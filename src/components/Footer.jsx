import { Link } from "react-router-dom";

export default function Footer(){ return (
    <footer className="bg-black text-white font-mono p-4 text-center flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-200"><img src="/logo.png" alt="" width={100}/></div>
        <p>&copy; CoDraw {new Date().getFullYear()} | All Rights Reserved.</p>
      </div>
      <p>Designed and Developed by <a href="https://meetdholakia.vercel.app" target="_blank"><span className="underline">Meet Dholakia</span></a></p>
    </footer>
  );}