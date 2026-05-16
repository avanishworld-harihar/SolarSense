declare module "sanscript" {
  type SanscriptStatic = {
    t(data: string, from: string, to: string, options?: Record<string, unknown>): string;
  };
  const Sanscript: SanscriptStatic;
  export default Sanscript;
}
