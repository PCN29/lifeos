import "./globals.css";

export const metadata = {
  title: "Life OS",
  description: "Deep work, gym and VCE tracking",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#10131A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-AU">
      <head><meta name="apple-mobile-web-app-capable" content="yes" /></head>
      <body>{children}</body>
    </html>
  );
}
