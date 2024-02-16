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
    - a unique identifier called "Client Identifier" to identify the extension (this UUID is generated once and stored in the browser storage)
    - a secure random 128 bit long one-time key used to encrypt the "link" hand-shake, see below (created every time a new "Link with.." is initiated and deleted after successful linking)
4. The user opens the app, clicks on "Link with a web browser" and scans the QR code
    - the app asks for a name of the linked browser and stores the Client UUID and the name in a table
    - the app starts a http/https-server and shows the ip address and/or hostname and port to the user and prompts them to input these in the extension
5. The user switches to the extension and clicks on "Next"-button and inputs the ip address or preferrely the hostname and clicks on "Link now"-button
6. The extension 
    - generats a new RSA key pair and stores both parts (private key and public key) securelly in a browser keystore
    - performs a http request to the provided host address that contains:
        - the Client Identifier from above as HTTP Header "X-Web-Client-ID"
        - the command "link" as HTTP Header "X-Web-Command"
        - A payload (as HTTP body) which is encrypted with the one-time key which contains:
            - the public key of the extension
7. The app (the server) receives the request and
    - looks up the Client Identifier
        - if unknown return 404 Not found
    - checks the command
        - if not "link" return 401 Bad Request
    - applies the previously shared one-time key to encrypt the payload
    - stores the extension's public key securelly in the AndroidKeyStore
    - replies to the extension with a payload encrypted with the previously shared one-time key which contains:
        - a new generated public key of the app (the private key is stored in the Android KeyStore and assigned to the identifier)
    - destroys the one-time key locally
8. The extension 
    - decrypts the payload with the one-time key
    - stores the app's public key securely in the browser's keystore
    - destroys the one-time key
    - displays a "Success"-dialog to the user

Now both parties have securelly and proven exchanged the public keys from each other to be used for the next communication.

#### Request a password for a website

0. The user browses a website which contains a password field and the extension marks this field with a "Request password"-button
1. The user clicks on this button
2. The extension shows a dialog which:
    - says "Open the app and accept this request"
    - contains the configured IP address / hostname (see "link" flow above)
    - also contains a shortened fingerprint of the extension's public key (as short as possible)
    - shows a timer which runs from 60s to 0s (the request will be aborted once the timer expires)
3. The extension creates a one-time session key (128bit) and stores it in memory    
4. The extension polls every 2 seconds to the configured host and port with
    - the Client Identifier from above as HTTP Header "X-Web-Client-ID"
    - the command "requestPassword" as HTTP Header "X-Web-Command"
    - the session key which is encrypted with the public key of the app (server) as HTTP Header "X-Web-Session-Key"
    - an encrypted payload which is AES encrypted with the session key:
        - contains the current website, e.g. "https://github.com/signin"
        - .. could later contain more data useful to create a new credential entry in the app (e.g. username)
    - a signature of the payload (headers + payload) performed with the private key of the extension
5. The user opens the app and unlocks the vault
6. The user turns on the server (if not automatically when unlock the vault) by clicking on a new UI switch on top of the credential list
    - if turned on the IP address / hostname is displayed and the new UI component is red to indicate a listening server!
6. The app takes the next polling request from the extension and looks it up by the provided Client Identifier
    - if not found return 404 Not found
    - if not linked return 403 not authenticated
    - else 
        - verifies the signature with the public key of the extension
        - decrypt the session key with the apps's private key of the associated extension keypair stored in the AndroidKeyStore
        - decrypt the payload with the session key and return 200 and ACC_WAIT
6. A message is shown in the app to confirm an incoming request by the user 
    - the message contains the linked client name and the sent website, like e.g. "'Home-PC' wants to know credentials for github.com. Accept / Deny"
    - the message also contains a short fingerprint of the extension's public key (as short as possible)
7. If extension keeps polling since they received ACC_WAIT from the server
8. The user compares the short fingerprint for equality and accepts the incoming request
9. The app performs a UI search with the website as search string (how it does today when Autofilling a browser)
10. The user either clicks on a credential or creates a new one (similar to Autofill flow)
11. As a result the app replies to the next incoming poll with the selected credential:
    - encrypts the username and password with the former decrypted session key 
    - sends both back to the extension with a 200 and ACC_REPLY
12. The extension stops polling when they receive ACC_REPLY and decrypts the username and password with the session key and use them for the Autfilling
13. The extension initiates a new Key Exchange (see below) with the same session key
14. After Key Exchange is done all parties destroy the curent session key

    
#### Implement Forward Secrecy / exchange new public keys

The idea is that periodically a new public key exchange happens to implement a forward secrecy machanism. This is to mitigate decrypting recorded communications in case of a private key has been leaked.
After a successful password request (after ACC_REPLY) this exchange will be performed.

1. The extension perform a new request short after the password delivery:
    - the Client Identifier from above as HTTP Header "X-Web-Client-ID"
    - the command "exchangeKeys" as HTTP Header "X-Web-Command"
    - A payload which is encrypted with the same session key as used for the password request:
        - contains a new public key created of the extension (the private counterpart is stored in the browser keystore)
2. The server takes the request and looks up by the provided Client Identifier
    - if not found return 404 Not found
    - if not linked return 403 not authenticated
    - else 
        - decrypts the payload with the session key from the password request
        - stores the new public key of the extension in the Android keystore
        - generates a new server side key pair and updates it in the Androif keystore
        - encryptes the new server public key with the sessin key
        - sends back the encrypted public key
        - deletes the old extension public key 
3. The extension takes the response and
    - decrypts the body with the session key
    - stores the decrypted server public key as new public key in the browser keystore
    - deletes the old server public key and own key pair



#### Unlink an app

To delete a linked app in the extension:

1. The user clicks on the extension's action button and select "Unlink with ANOTHERpass app"
2. A confirmation dialog is shown to get user confirmation. It displays:
    - the ip or hostname with port
3. Once confirmed, the extension deletes 
    - the ip/host details 
    - the app's public key from the browser keystore
    - the extensions RSA key pair from the browser keystore 


#### Unlink in the app

To delete a linked extension in the app

1. Go to "Manage linked extensions"
2. Select the link by the given name and click on the Trash-icon
    - The app deletes the stored
        - Web Identifier
        - apps RSA key pair
        - extensions public key





App entities:

WebExtensionEntity
- id
- name or title
- webClientUuid
- extensionPublicKeyAlias
- serverKeyPairAlias



Next steps:
 1. Build a extension page that contains a generated UUID and a generated public key in a QR code. Store UUID and key pair in the browser.
 2. Build a second page that asks for host details (ip or hostname) and port (defual prefilled) and store them in the browser
 3. Implement a server in the app which can be turned on and off by the user.
 4. Implement an activity to scan the QR code and store the needed information in the app (table WebExtensionEntity).
 5. Implement the first endpoint/command to take the link handshake request
 6. Integrate this endpoint in the extension after step 2.

