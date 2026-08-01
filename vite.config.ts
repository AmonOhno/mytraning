import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Vite の既定ターゲット(ios16.4)は iOS プロジェクトの対応 OS より新しく、
    // 古い端末では JS が読み込めずアプリ全体が空表示になる。
    // structuredClone / crypto.randomUUID を使うため下限は iOS 15.4 とする。
    target: ['safari15.4', 'ios15.4', 'chrome100', 'edge100', 'firefox100'],
  },
  define: {
    // iOS アプリに古い web 資産が同梱されたままかを端末上で判別できるようにする
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
