"use client";

import Image from "next/image";
import { doSocialLogin } from "@/app/actions";

const Social = () => {
  return (
    <>
      <ul className="flex justify-center gap-4">
        <li className="flex-1 max-w-[40px]">
          <a
            href="#"
            className="inline-flex h-10 w-10 p-2 bg-[#1C9CEB] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <Image width={30} height={30} className="w-full h-full" src="/images/icon/tw.svg" alt="twitter" />
          </a>
        </li>
        <li className="flex-1 max-w-[40px]">
          <a
            href="#"
            className="inline-flex h-10 w-10 p-2 bg-[#395599] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <Image width={30} height={30} className="w-full h-full" src="/images/icon/fb.svg" alt="facebook" />
          </a>
        </li>
        <li className="flex-1 max-w-[40px]">
          <a
            href="#"
            className="inline-flex h-10 w-10 p-2 bg-[#0A63BC] text-white text-2xl flex-col items-center justify-center rounded-full"
          >
            <Image width={30} height={30} className="w-full h-full" src="/images/icon/in.svg" alt="linkedin" />
          </a>
        </li>
        <li className="flex-1 max-w-[40px]">
          <form
            action={async () => {
              const formData = new FormData();
              formData.append("action", "google");
              await doSocialLogin(formData);
            }}
          >
            <button type="submit" className="inline-flex h-10 w-10 p-2 bg-[#EA4335] text-white text-2xl flex-col items-center justify-center rounded-full cursor-pointer">
              <Image width={30} height={30} className="w-full h-full" src="/images/icon/gp.svg" alt="google" />
            </button>
          </form>
        </li>
      </ul>
    </>
  );
};

export default Social;
