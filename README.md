## Web Extension to communicate with ANOTHERpass app from a browser

The web extension (called the extension) can connect to an ANOTHERpass app (called the app) running on a device which is reachable from the browser. To achieve this:

- the device where the extension in a browser runs and the device where the app runs is either in the same local network (recommended) or IP forwarding / DynDNS is implemented (to connect from outside of the local network)
- the device where the app runs is connected to the same network as the device where the browser runs (recommended) or to the internet
- the app acts as server, the extension as client
- used protocol is HTTP/HTTPS to enable the extension to access the app (HTTPS requires a valid server certificate)
- to easily find the app, the app device shall use a device name as hostname (default for most Android devices) or the device IP address is needed by the extension
- a port can be configured on both ends (default 8000)

### Use Cases (initial idea)

#### Link Extension with the App

To achieve a maximum of security the extension and the app must be linked before usage. That basically means both parties exchange public keys to ensure a secure communication over a secure offline-channel which cannot be observed (to avoid MITM-attacks).

Using HTTPS is not constructive because the server (the app) cannot provide a TLS certificate signed by a common CA. A solution could be to include the certificate in the extension (if accepted by the browsers). In any way, we don't want to rely on TLS only and want to be able to use plain HTTP as well with our own encryption layer. This will be achieved by exchanging public keys beforehand through a secure offline-channel in a so called "linking"- step. This is feasible because a user should have physical access to the app (the server) and the extension in a browser (the client) at the same time and place.

1. The user installs the extension in the brower
2. The user clicks on the extension's action button and select "Link with ANOTHERpass app"
3. A page opens with a generated QR code displayed which contains
   - a unique identifier called "Client Identifier" to identify the extension (this UUID is generated once and stored in the browser storage)
   - a secure random 128 bit long one-time key used to encrypt the "link" hand-shake, see below (created every time a new "Link with.." is initiated and deleted after successful linking)
4. The user opens the app, clicks on "Link with a web browser" and scans the QR code
   - the app asks for a name of the linked browser and stores the Client ID and the name in a table
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
7. The app takes the next polling request from the extension and looks it up by the provided Client Identifier
   - if not found return 404 Not found
   - if not linked return 403 not authenticated
   - else
     - verifies the signature with the public key of the extension
     - decrypt the session key with the apps's private key of the associated extension keypair stored in the AndroidKeyStore
     - decrypt the payload with the session key and return 200 and ACC_WAIT
8. A message is shown in the app to confirm an incoming request by the user
   - the message contains the linked client name and the sent website, like e.g. "'Home-PC' wants to know credentials for github.com. Accept / Deny"
   - the message also contains a short fingerprint of the extension's public key (as short as possible)
9. If extension keeps polling since they received ACC_WAIT from the server
10. The user compares the short fingerprint for equality and accepts the incoming request
11. The app performs a UI search with the website as search string (how it does today when Autofilling a browser)
12. The user either clicks on a credential or creates a new one (similar to Autofill flow)
13. As a result the app replies to the next incoming poll with the selected credential:
    - encrypts the username and password with the former decrypted session key
    - sends both back to the extension with a 200 and ACC_REPLY
14. The extension stops polling when they receive ACC_REPLY and decrypts the username and password with the session key and use them for the Autfilling

#### Implement Forward Secrecy

The idea is that for each single request and response a different secret key is used. This is to mitigate decrypting recorded communications.


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

# Key mechanisms

## Common communication between extension and app

Each communication is secured by two layers of encryption:


1. AES encryption of the payload (request and response body) with a changing 128bit **Transport Key** (`TK`)
	* `TK` is derived from:
        *  a shared and on each side persisted 128bit **Base Key** (`BK`)
        *  a randomnly generated 128bit **One-Time Key** (`OTK`) 
        *  --> `TKn = SHA256(BK + OTKn)`
        *  `TK` is derived/regenerated for each communication direction:
            *  request (extension to app): **Request Transport Key** --> `TKrq = SHA256(BK + OTKrq)`
            *  response (app to extension): **Response Transport Key** --> `TKrs = SHA256(BK + OTKrs)`

1. RSA encryption of the **One-Time Keys** (`OTKn`)
    * since the `BK` is shared and known by each side, only the `OTK` must be send to the peer
        * `OTKrq` is encrypted with the **Public Key of the app** (`PKapp`)
        * `OTKrs` is encrypted with the **Public Key of the extension** (`PKext`)

## Linking phase

Before common communication can happen, a few information must be exchanged between the extension and the app.

* **Public Keys** (`PKn`) must be exchanged
* **Base Key** (`BK`) must be exchanged
* Both `PKn` and `BK` are securely stored on each side.

Exchange happens through these steps:

1. The extension generates:
    * a temporary AES-128bit **Session Key** (`SK`) designated to secure the linking phase
    * the **extension-side RSA key pair** (4096bit, `PKext` and `PrivKext`, latter will never leave the extension)
    * the fingerprint of `PKext` (`F`)
1. The extension sends `SK` and `F` through a secure offline channel (QR code scan) to the app
1. The user initiates a HTTP request to the app by providing the app's IP or domain name. The extension submits:
    * the **Extensions Public Key** `PKext` 
1. The app imports `PKext` and
    * verifies `PKext` with `F` to mitigate MITM key substitution (fails if not valid)
    * stores `PKext` for future communication
1. The app generates:
    * the **app-side RSA key pair** (`PKapp` and `PrivKapp`, latter will never leave the extension)
    * the shared **Base Key** (`BK`) and stores it for future communication
    * a **One-Time Key** (`OTKrs`)
    * a **Transport Key** derived from the previous scanned **Session Key**, since `BK` is not yet known by the extension --> `TKrs = SHA256(SK + OTKrs)`
1. Now the app responds to the extension as described in "Common communication" but with a differently derived **Transport Key**:
    * by using `PrivKext` to decrypt `TKrs` (common behaviour)
    * using `TKrs` to decrypt the payload (common behaviour)
    * Payload contains:
        * `PKapp`
        * `BK`
1. The extension stores `PKapp` and `BK` in the browser for later usage.

## Security considerations

### Man-in-the-Middle attacks

The communication between app and extension should usually happen in a local network, but still there is a risk of malicious actors in the same network. For instance an attack could have gained access to the local network and is able to sniff any network communication.

Mitigations:

  * Each communication is encrypted as described above
  * The `PKext` used to encrypt the `TKrs` is confirmed by using a QR-code and a fingerprint `F`. Therefor all data encrypted with `PKext` is only decryptable  by the extension.
  * For each link request and for each credential request a shortened fingerprint is promped to the users on both ends to confirm uniquenes. This ensure that `PKapp` is indeed the public key of the app.

### Offline observers

Meant is an attacker who is able to capture the QR code during the linking phase, either through physical presense or through getting a screenshot of the QR-Code.

Mitigations:

  * If an attacker is able to capture `SK` they wont be able to read the `BK`, since it is encrypted with a `TKrs` encrypted by `PKext`. 

### Post-Quantum consideration

Consider RSA will be broken through Quantum Computing. If so, all encrypted data with the involved RSA keys are revealed.

Mitigations:

  * The `BK` is shared during the linking phase through a confirmed and secure channel (encrypted by `SK`). As long as `SK` is not leaked the `BK` should be safe to decrypt the `TKn`.
  *
