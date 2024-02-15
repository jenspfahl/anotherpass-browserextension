## Web Extension to communicate with ANOTHERpass app from a browser

The web extension (called the extension) can connect to an ANOTHERpass app (called the app) running on a device which is reachable from the browser. To achieve this:
 - the device where the extension in a browser runs and the device where the app runs is either in the same local network (recommended) or IP forwarding / DynDNS is implemented (to connect from outside of the local network)
 - the device where the app runs is connected to the same network as the device where the browser runs (recommended) or to the internet
 - the app acts as server, the extension as client
 - used protocol is HTTP/HTTPS to enable the extension to access the app (HTTPS requires a valid server certificate)
 - to easily find the app, the app device shall use a device name as hostname (default for most Android devices) or the device IP address is needed by the extension
 - a port can be configured on both ends (default 8000)


 ### Use Cases

 #### Link Extension with the App

 To achieve a maximum of security the extension and the app must be linked before usage. That basically means both parties exchange public keys to ensure a secure communication over a secure offline-channel which cannot be observed (to avoid MITM-attacks). 

 Using HTTPS is not constructive because the server (the app) cannot provide a TLS certificate signed by a common CA. A solution could be to include the certificate in the extension (if accepted by the browsers). In any way, we don't want to rely on TLS only and want to be able to use plain HTTP as well with our own encryption layer. This will be achieved by exchanging public keys beforehand through a secure offline-channel in a so called "linking"- step. This is feasible because a user should have physical access to the app (the server) and the extension in a browser (the client) at the same time and place.   

1. The user installs the extension in the brower
2. The user clicks on the extension's action button and select "Link with ANOTHERpass app"
3. A page opens with a generated QR code displayed which contains 
    - a unique identifier to identify the extension (this UUID is generated once and stored in the browser storage)
    - a secure random 128 bit long one-time key used to encrypt the "link" hand-shake, see below (created every time a new "Link with.." is initiated and deleted after successful linking)
4. The user opens the app, clicks on "Link with a web browser" and scans the QR code
    - the app asks for a name of the linked browser and stores the identifier and the name in a table
    - the app starts a http/https-server and displays the ip address and/or hostname and port to the user and prompt them to input these in the extension
5. The user switches to the extension and clicks on "Next"-button and inputs the ip address or preferrely the hostname and click on "Link now"-button
6. The web extension 
    - generats a new RSA key pair and stores both parts (private key and public key) securelly in a browser KeyStore
    - performs a http request to the provided host details that contains:
        - the extension identifier from above as HTTP Header "X-Web-Client-ID"
        - the command "link"
        - A payload which is encrypted with the one-time key which contains:
            - the public key of the extension
7. The app (the server) receives the request and
    - looks up the identifier
        if unknown return 401 Bad Request
    - checks the command and
        if not "link" return 401 Bad Request
    - takes the previously received one-time key to encrypt the payload
    - stores the extensions public key securelly in the AndroidKeyStore
    - replies to the extension with a payload encrypted with the previously shared one-time key which contains:
        - a new generated public key of the app the private key is stored in the Android KeyStore assigned to the identifier)
    - destroys the one-time key locally
8. The extension 
    - decrypts the payload with the one-time key
    - stores the app's public key securely in the browser's KeyStore
    - destroys the one-time key
    - displays a "Success"-dialog to the user

Now both parties have securelly and proven exchanged the public keys from each other to be used for the next communication.

#### Request a password for a website

0. The user browses a website which contains a password field and the extension marks this field with a "Request password"-button
1. The user clicks on this button
2. The extension shows a dialog which:
    - says "Open the app and accept this request"
    - contains the configured IP address / hostname (see link flow above)
    - also contains a shortened fingerprint of the extension's public key (as short as possible)
    - shows a timer which runs from 60s to 0s (the request will be aborted once the timer expires)
3. The extension creates a one-time session key (128bit) and stores them in memory    
4. The extension polls every 2 seconds to the configured host and port with
    - the identifier from above as HTTP Header "X-Web-Client-ID"
    - the command "requestPassword"
    - The session key which is encrypted with the public key of the app (server) as HTTP Header "X-Web-Session-Key"
    - An encrypted payload which is AES encrypted with the session key:
        - contains the current website, e.g. "https://github.com/signin"
    - a signature of the payload (headers + payload) performed with the private key of the extension
5. The user opens the app and unlocks the vault
6. The user turns on the server (if not automatically when unlock the vault) by clicking on a new UI switch on top of the credential list
    - if turned on the IP address / hostname is displayed and the new UI component is red to indicate a listening server!
6. The app takes the next polling request from the extension and looks up by the provided client identifier
    - if not found return 404 Not found
    - if not linked return 403 not authenticated
    - else 
        verifies the signature with the public key of the extension
        decrypt the session key "X-Web-Session-Key" with the server's private key of the associated extension keypair stored in the AndroidKeyStore
        decrypt the body with the session key and return 200 and ACC_WAIT
6. A message is shown in the app to confirm an incoming request by the user 
    - the message contains the linked client name and the sent website, like e.g. "'Home-PC' wants to know credentials for github.com. Accept / Deny"
    - the message also contains a short fingerprint of the web extension's public key (as short as possible)
7. If web extension keeps polling since they received ACC_WAIT from the server
8. The user compares the short fingerprint for equality and accepts the message from 6.
9. The app performs a UI search with the website as search string (how it does today when Autofill a browser)
10. The user either clicks on a credential or creates a new one (similar to Autofill flow)
11. As a result the app responds to the next incoming poll with the selected credential:
    - encrypting the username and password with the former descrypted session key 
    - sending this back to the web extension with a 200 and ACC_REPLY
12. The web extension stops polling when they receive ACC_REPLY and decrypts the password with the session key and uses it for the Autfill field
13. All parties destroy the session key

    
#### Implement Forward Secrecy / exchange new public keys

The idea is that periodically a new public key exchange happens to implement a forward secrecy machanism. This is to mitigate decrypting recorded communications once a private key has been leaked.
After a successful password request this exchange will be performed.

1. The web extension perform a new request short after the password delivery:
    - the identifier from above as HTTP Header "X-Web-Client-ID"
    - the command "exchangeKeys"
    - An encrypted body which is encrypted with the last public key of the app/server:
        - contains a new public key created by the web extension (the private counterpart is stored in the KeyStore
2. The server takes the request and looks up by the provided client identifier.
    - if not found return 404 Not found
    - if not linked return 403 not authenticated
    - else 
        decryypts the body with the private key of the server
        stores the new public key of the extension in the Android keystore
        generates a new server side key pair and stores it in the Androif keystore
        encryptes the new server public key with the public key of the extension
        sends back the encrypted public key
        deletes the old web extension public key 
3. The extension takes the response and
    decrypts the body with the private key of the extension
    stores the decrypted server public key as new public key in the extension's keystore
    Deletes the old server public key and own key pair



App entities:

WebExtensionEntity
- id
- extensionUuid
- extensionPublicKeyAlias
- serverKeyPairAlias


