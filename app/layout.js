import "./globals.css";

export const metadata = {
  title: "Webinar Tracker",
  description: "Suivi campagne publicitaire webinaire",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
