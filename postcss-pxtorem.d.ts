declare module 'postcss-pxtorem' {
  import type { PluginCreator } from 'postcss'
  const pxtorem: PluginCreator<Record<string, unknown>>
  export default pxtorem
}
