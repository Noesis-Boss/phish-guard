# Phish Guard

Phish Guard is a free Chrome extension that warns you inside Gmail, Outlook, Yahoo Mail, and Proton Mail when an email may be pretending to be a company you trust.

It runs locally on your computer, does not upload your email, and does not require an account.

> This is a maintained fork of [petergyang/phish-guard](https://github.com/petergyang/phish-guard) with multi-platform support: warnings now work in Outlook, Yahoo Mail, and Proton Mail alongside Gmail.

## Enough with the phishing emails

![Phish Guard warning for an HBO impersonation email](docs/assets/readme/phish-guard-example.png)

Spam emails often copy the names and logos of companies you know. They say a payment failed, a package is stuck, or your subscription needs attention. The goal is to make you click before you think.

Phish Guard gives you a second pair of eyes. If the sender does not match the company the email claims to be from, it shows a plain warning above the message. It stays quiet for normal email.

## How to install

Currently, Phish Guard uses Chrome's manual extension install flow. It is a little clunky, but it takes about two minutes.

![Chrome extension setup screen](docs/assets/readme/chrome-extension-setup.svg)

1. Download this repository (Code → Download ZIP) and unzip it, or run `npm run build` in `apps/chrome-extension` to produce `dist/chrome-extension`.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder that contains `manifest.json`.
6. Open your mail site (Gmail, Outlook, Yahoo Mail, or Proton Mail), click the Phish Guard toolbar icon, and choose **Turn on mail warnings**.

Chrome asks for webmail access so Phish Guard can check the open message and add the warning banner. Access is granted per platform in the popup; nothing runs on a mail site until you allow it. A Chrome Web Store version is planned if the alpha goes well.

If Chrome shows extension errors later, go back to `chrome://extensions`, click **Reload** on Phish Guard, and refresh your mail tab.

## How Phish Guard works

When you turn on mail warnings, Chrome gives Phish Guard permission to run on the mail sites you allow. The extension watches the message view and reads only the message you have open.

Phish Guard checks the sender name, sender email address, subject, visible message text, and links. It compares what the email claims to be with where it actually came from.

If the evidence looks suspicious, Phish Guard adds a warning banner inside the message view. Each platform has its own small reader that knows how to find the open message on that site; the detection logic is shared. Everything runs locally in your browser; there is no server, account, analytics, or email upload.

Gmail, Outlook, Yahoo Mail, and Proton Mail are supported today.

### Other webmail providers

Because each platform has its own reader, new ones can be added without touching the detection logic. Any webmail that renders messages in the page (Zoho, Fastmail, Roundcube, self-hosted webmail) can be supported with a small per-platform file that locates the open message's sender, subject, and body in that site's HTML. If you use a provider not listed here, open an issue with the message-view HTML (redact personal details) and a reader can be added.

## Private and local first

Phish Guard checks only the message you have open. It looks at the sender, subject, visible words, and links in that message.

It does **not**:

- Upload your email.
- Scan your inbox history.
- Read attachments.
- Access your contacts, cookies, or passwords.
- Visit links for you.
- Edit, delete, send, archive, label, or report emails.

Read the full policy in [PRIVACY.md](PRIVACY.md).

## How to contribute

Eventually I want this extension to work across other phishing attempts. Contributions are welcome.

Open an issue or pull request if you spot a bug, a false positive, or a way to make Phish Guard better.

Please do not post full email bodies, attachments, private links, or private inbox screenshots. Sender names and domains are usually enough.
