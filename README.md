# Intro

## Disclaimer

This extension is still work in progress. Although the security and communication layer should be stable, the UI needs to be polished. 

## Purpose

This is a Web Extension to communicate with ANOTHERpass app from a browser as single source of truth.

The web extension (called the extension) can connect to an [ANOTHERpass V2 app](https://github.com/jenspfahl/ANOTHERpass/tree/rc-2.0.0) (called the app, download the latest beta [here](https://anotherpass.jepfa.de/app/anotherpass_beta.apk)) running on a device which is reachable from the browser. To achieve this:

- the device where the extension in a browser runs and the device where the app runs is either in the same local network (recommended) or IP forwarding / DynDNS is implemented (to connect from outside of the local network)
- the device where the app runs is connected to the same network as the device where the browser runs (recommended) or to the internet
- the app acts as server, the extension as client
- used protocol is HTTP/HTTPS to enable the extension to access the app (HTTPS requires a valid server certificate)
- to easily find the app, the app device shall use a device name as hostname (default for most Android devices) or the device IP address is needed by the extension
- a port can be configured on both ends (default 8001)

# Installing

This extension is under development and not yet published on any browsers extension stores. The plan is to support at least Firefox and Chrome.

To install this extension you have to clone this repository and use `about:debugging#/runtime/this-firefox` to temporary load this extension to Firefox by selecting the `manifest.json`.

# Use Cases (outline)

## Link Extension with the App

To achieve a maximum of security the extension and the app must be linked before usage. That basically means both parties exchange public keys to ensure a secure communication over a secure offline-channel which cannot be observed (to avoid MITM-attacks).

Using HTTPS is not constructive because the server (the app) cannot provide a TLS certificate signed by a common CA. A solution could be to include the certificate in the extension (if accepted by the browsers). In any way, we don't want to rely on TLS only and want to be able to use plain HTTP as well with our own encryption layer. This will be achieved by exchanging public keys beforehand through a secure offline-channel in a so called "linking"- step. This is feasible because a user should have physical access to the app (the server) and the extension in a browser (the client) at the same time and place.

1. The user installs the extension in the brower
2. The user clicks on the extension's action button and select "Link with app"
3. A page opens with displaying a unique identifier and a generated QR code 
4. The user opens the app and starts the server
5. The user clicks on "Link new device" and a new screen is shown
6. The app asks 
    1. for a human name of the new link (e.g. "My laptop")
    2. to scan the QR code presented by the browser extension
7. Once scanned, the app displays the same unique identifier  as the extension
8. The user has to enter the IP or host name displayed in the app into the related field in the extension and click on "Next" button
9. The app and the extension begin to process. When done, both show a linking confirmation with a fingerprint wich should be equal
10. If the user confirms equality on both ends, the link process is completed  

Now both parties have securelly and proven exchanged the public keys from each other to be used for the next communication.

## Request a password for a website

1. The user browses a website which contains a password field and the extension marks this field with a "Request password"-button
2. The user clicks on this button
3. The extension shows a dialog which:
   - says "Open the app and accept this request"
   - contains the configured IP address / hostname (see "link" flow above)
   - also contains a shortened fingerprint
   - shows a timer which runs from 60s to 0s (the request will be aborted once the timer expires)
4. The extension polls every x seconds to the configured host and port 
5. The user opens the app and unlocks the vault
6. The user turns on the server (if not automatically when unlock the vault) by clicking on a new UI switch on top of the credential list
   - if turned on the IP address / hostname is displayed and the new UI component is red to indicate a listening server!
7. The app takes the next polling request from the extension
8. A message is shown in the app to confirm an incoming request by the user
   - the message contains the linked client name and the sent website, like e.g. "'Home-PC' wants to know credentials for github.com. Accept / Deny"
   - the message also contains a short fingerprint
9. The extension keeps polling until the user accepts or denies or cancels the request
10. The user compares the short fingerprint for equality and accepts or denies the incoming request
11. The app performs a UI search with the website as search string (how it does today when Autofilling a browser)
12. The user either clicks on a credential or creates a new one (similar to Autofill flow)
13. As a result the app replies to the next incoming poll with the selected credential
14. The extension stops polling and decrypts the username and password and use them for the Autfilling


## Unlink an app

To delete a linked app in the extension:

1. The user clicks on the extension's action button and select "Unlink with ANOTHERpass app"
2. A confirmation dialog is shown to get user confirmation.
3. Once confirmed, the extension deletes
   - the ip/host details
   - all exchanged secret keys

## Unlink in the app

To delete a linked extension in the app

1. Go to "Manage linked extensions"
2. Select the link by the given name and click on the Trash-icon
   - The app deletes the stored
     - Web Identifier
     - all exchanged secret keys


# Security mechanisms

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
    * by using `PrivKext` to encrypt `OTKrs` (common behaviour)
    * using derived `TKrs` to encrypt the payload (common behaviour)
    * Payload contains:
        * `PKapp`
        * `BK`
1. The extension decrypts `OTKrs` with its `PKext` and derives the `TKrs` by using the `SK` (instead of `BK` in the common flow)
1. The extension stores the received `PKapp` and `BK` in the browser for later usage

## Security considerations

### Man-in-the-Middle attacks

The communication between app and extension should usually happen in a local network, but still there is a risk of malicious actors in the same network. For instance an attacker could have gained access to the local network and is able to sniff any network communication.

Mitigations:

  * Each communication is encrypted as described above
  * The `PKext` used to encrypt the `TKrs` is confirmed by using a QR-code and a fingerprint `F`. Therefor all data encrypted with `PKext` is only decryptable  by the extension.
  * For each link request and for each credential request a shortened fingerprint is promped to the user on both ends to confirm uniquenes. This ensure that `PKapp` is indeed the public key of the app.

### Offline observers

Meant is an attacker who is able to capture the QR code during the linking phase, either through physical presense or through getting a screenshot of the QR-Code.

Mitigations:

  * If an attacker is able to capture `SK` they wont be able to read the `BK`, since it is encrypted with a `TKrs` derived and encrypted by `PKext`. 

### Post-Quantum consideration

Consider RSA will be broken through Quantum Computing. If so, all encrypted data with the involved RSA keys are revealed.

Mitigations:

  * The `BK` is shared during the linking phase through a confirmed and secure channel (encrypted by `SK`). As long as `SK` is not leaked, the `BK` should be safe to decrypt the `TKn`.
  

# Future ideas

## Add action to fetch a certain credential from the app

A new action in the extension to just pick up one credential username/password of the users choise and display it in a new browser dialoge (with a copy to clickboard option).

## Add option to remember the selected credential

Once a credential is selected in the app and sent back the the extension, its UID is stored together with the current webpage url in the extension storage. During the next fill-request the credential will be pushed immediatelly after user approval for the current webpage (by UID).
This would reduce the needed app interaction (selecting the right credential).

 
## Add option to remember the selected credential at all

Once a credential is selected in the app and sent back the the extension, it is stored encryptetly together with the current webpage url in the extension storage. During the next fill-request the app is only needed to unlock the extension storage (for x minutes or current session).
This would reduce the app interaction even more.

## Add action to sync a set of credentials in the extension

A new action in the extension to fetch all or a subset of credentials from the app and store them encrypted in the extension storage.
Unlocking of these extensions would done by an app request te user has to approve.
This action could be split in two, one to fetch only the UID, name and webpage of the credentials and another to also fetch username and passwords.
This would even more reduce the app interaction. 

## Add action to push credentials to the app

A new action to push certain credentials stored in the extension back to the app. If they exist in the app, they might be overwritten or created as copy. This feature would only make sense to migrate existing credentials to the app. 
