declare module "@sparticuz/chromium" {
  const chromium: {
    args: string[];
    headless: boolean;
    executablePath: () => Promise<string>;
    setGraphicsMode?: boolean;
  } & { [key: string]: any };
  export default chromium;
}
