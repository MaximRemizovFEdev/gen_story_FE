"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { trackPage } from "../utils/analytics";

export default function Metrica() {
  const pathname = usePathname();

  return (
    <Script
      id="yandex-metrica"
      strategy="afterInteractive"
      onLoad={() => trackPage(pathname)}
    >
      {`try{(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(113444344,"init",{defer:true,clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false,sendTitle:false});}catch(_){}`}
    </Script>
  );
}
