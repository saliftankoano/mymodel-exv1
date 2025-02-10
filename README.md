# My Model

This is a Chrome extension that allows you to earn money by consenting to data sharing with brands.

# Features To Do

- [ ] Integrate login with Google with supabase (This will be useful to track email if user opts in)
- [ ] Integrate email tracking with supabase
- [ ] Integrate browser history tracking with supabase
- [ ] Add a popup to the extension icon to see the earnings and settings
- [ ] Add a page to see the earnings history
- [ ] Add a page to see the settings
- [ ] Add a page to see the privacy policy
- [ ] Add a page to see the terms of service

# Hurdles & Solutions

### 1- Supabase Google Auth without redirect url since it's a chrome extension

Fixed by adding the supabase auth redirect url to the redirect url in the cloud console and using a popup window to open the auth url

## Development

```bash
npm install
npm run dev
npm run build
```

Add the extension to Chrome on developer mode to test it:

- Pick the dist folder
- on chrome://extensions/
- Check "Developer mode"
- Click on "Load unpacked"
- Select the dist folder

Extension ID: bhidddkliaoapnglkcjjficomonodldf
Extension ID: bhidddkliaoapnglkcjjficomonodldf
