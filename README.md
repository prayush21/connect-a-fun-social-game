# Connect - A Collaborative Word Guessing Game

A real-time multiplayer word guessing game built with Firebase and Tailwind CSS.

## Setup Instructions

1. Clone the repository

```bash
git clone <repository-url>
cd chatroom-app
```

2. Set up Firebase Configuration

- Copy `config.example.js` to `config.js`:

```bash
cp config.example.js config.js
```

- Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
- Add a new Web App to your project
- Replace the placeholder values in `config.js` with your Firebase project's configuration

3. Run the application

- Open `index.html` in your browser
- For development, you can use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server
```

## Security Notes

- The `config.js` file contains sensitive Firebase project credentials and is git-ignored
- Never commit `config.js` to version control
- Keep your Firebase credentials secure and don't share them publicly
- For production deployment, consider using environment variables or a secure secrets management system

## Development

- Make changes to the code as needed
- Test thoroughly before deploying
- Don't modify `config.js` directly in production - use environment variables or your deployment platform's secrets management
