import "./globals.css";
import Navigation from "../components/Navigation";

export const metadata = {
  title: "Clocked Audio | Gamified Audio SaaS",
  description: "A fast-paced audio challenge arena. Producers download stems, flip them in 20 minutes, and join a TikTok-style swipe voting battle feed. Climb the rankings from Bedroom Producer to Label Executive!",
};

import GlobalAudioListener from "../components/GlobalAudioListener";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // Intercept global uncaught errors thrown by event listeners before Next.js error overlay sees them
                window.addEventListener('error', function(event) {
                  if (event.error === undefined || (event.error && event.error.stack && event.error.stack.includes('webkit-masked-url'))) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    console.warn('Caught Safari extension error in window.onerror');
                  }
                }, true); // Capture phase is required to intercept before Next.js

                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason === undefined || (event.reason && event.reason.stack && event.reason.stack.includes('webkit-masked-url'))) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    console.warn('Caught Safari extension unhandledrejection');
                  }
                }, true); // Capture phase

                const originalDispatch = window.dispatchEvent;
                window.dispatchEvent = function() {
                  try {
                    return originalDispatch.apply(this, arguments);
                  } catch (err) {
                    if (err === undefined || (err && err.stack && err.stack.includes('webkit-masked-url'))) {
                      console.warn('Caught Safari extension error in dispatchEvent');
                      return false;
                    }
                    throw err;
                  }
                };
                
                const originalPush = window.history.pushState;
                window.history.pushState = function() {
                  try {
                    return originalPush.apply(this, arguments);
                  } catch (err) {
                    if (err === undefined || (err && err.stack && err.stack.includes('webkit-masked-url'))) {
                      console.warn('Caught Safari extension error in pushState');
                      return;
                    }
                    throw err;
                  }
                };
                
                const originalReplace = window.history.replaceState;
                window.history.replaceState = function() {
                  try {
                    return originalReplace.apply(this, arguments);
                  } catch (err) {
                    if (err === undefined || (err && err.stack && err.stack.includes('webkit-masked-url'))) {
                      console.warn('Caught Safari extension error in replaceState');
                      return;
                    }
                    throw err;
                  }
                };
              }
            `
          }}
        />
      </head>
      <body>
        <GlobalAudioListener />
        <div className="app-shell">
          <Navigation />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
