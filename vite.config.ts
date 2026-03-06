import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Function to generate the build version string
const getBuildVersion = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    '__BUILD_VERSION__': JSON.stringify(getBuildVersion())
  }
})
