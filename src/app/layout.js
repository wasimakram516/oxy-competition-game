import { Roboto } from "next/font/google";
import "../styles/globals.css";
import AppThemeProvider from "../styles/theme-provider";

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

export const metadata = {
  title: "OXY Competition Game",
  description: "Next.js app with MUI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={roboto.variable}>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
