"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import RegForm from "@/components/auth/register-form";
import Social from "@/components/auth/social";

// Main platform domains where registration is allowed
const MAIN_DOMAINS = [
  "localhost",
  "enfyjobs.com",
  "www.enfyjobs.com",
  "enfycon.com",
  "www.enfycon.com",
];

const MAIN_REGISTER_URL =
  process.env.NEXT_PUBLIC_MAIN_DOMAIN_URL || "https://enfyjobs.com";


function Logo() {
  const { theme } = useTheme();
  return (
    <div>
      <Image
        src={
          theme === "dark"
            ? "/images/logo/logo-white.svg"
            : "/images/logo/logo.svg"
        }
        alt="Enfycon Logo"
        width={144}
        height={36}
        className="w-36 h-auto"
        priority
      />
    </div>
  );
}

function Copyright() {
  const currentYear = new Date().getFullYear();
  return <>Copyright {currentYear}, Enfycon All Rights Reserved.</>;
}

const Register = () => {
  const [isSubdomain, setIsSubdomain] = React.useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hostname = window.location.hostname.toLowerCase();

    // isMain = true for bare localhost or known apex domains
    const isMain =
      hostname === "localhost" ||
      MAIN_DOMAINS.includes(hostname);

    if (!isMain) {
      setIsSubdomain(true);

      // Localhost subdomain (e.g. deb.localhost) → redirect to local dev server
      if (hostname.endsWith(".localhost")) {
        const port = window.location.port || "3000";
        window.location.replace(`http://localhost:${port}/auth/register`);
      } else {
        // Production tenant subdomain → redirect to main domain
        window.location.replace(`${MAIN_REGISTER_URL}/auth/register`);
      }
    }
  }, []);

  // Don't flash the form while redirecting away
  if (isSubdomain) return null;

  return (
    <>
      <div className="flex w-full items-center overflow-hidden min-h-screen h-screen basis-full">
        <div className="overflow-y-auto flex flex-wrap w-full h-screen">
          
          {/* Left panel (desktop only) */}
          <div className="lg:block hidden flex-1 overflow-hidden text-[40px] leading-[48px] text-default-600 relative z-1 bg-default-50">
            <div className="max-w-[520px] pt-20 ps-20">
              <Link href="/" className="mb-6 inline-block">
                <Logo />
              </Link>

              <h4 className="text-[40px] leading-[48px] text-default-600 font-normal">
                Unlock your Project
                <span className="text-default-800 font-bold ms-2 block sm:inline">
                  performance
                </span>
              </h4>
            </div>
            <div className="absolute left-0 bottom-[-130px] h-full w-full z-[-1]">
              <Image
                src="/images/auth/ils1.svg"
                alt="Branding background"
                priority
                width={300}
                height={300}
                className="mb-10 w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right panel: Register form */}
          <div className="flex-1 relative dark:bg-default-100 bg-white">
            <div className="h-full flex flex-col">
              <div className="max-w-[524px] md:px-[42px] md:py-[44px] p-7 mx-auto w-full text-2xl text-default-900 mb-3 h-full flex flex-col justify-center">
                <div className="flex justify-center items-center text-center mb-6 lg:hidden ">
                  <Link href="/">
                    <Logo />
                  </Link>
                </div>
                
                <div className="text-center 2xl:mb-10 mb-5">
                  <h4 className="font-medium">Register Your Company</h4>
                  <div className="text-default-500 text-base">
                    Set up your team's ATS workspace in 2 minutes
                  </div>
                </div>

                <RegForm />

                <div className="relative border-b-[#9AA2AF] border-opacity-[16%] border-b pt-6">
                  <div className="absolute inline-block bg-default-50 dark:bg-default-100 left-1/2 top-1/2 transform -translate-x-1/2 px-4 min-w-max text-sm text-default-500 font-normal">
                    Or continue with
                  </div>
                </div>

                <div className="max-w-[242px] mx-auto mt-8 w-full">
                  <Social />
                </div>

                <div className="md:max-w-[345px] mx-auto mt-6 text-center">
                  <span className="text-sm text-default-500">Already have an account? </span>
                  <Link
                    href="/auth/login"
                    className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:underline"
                  >
                    Sign In
                  </Link>
                </div>

              </div>
              <div className="text-xs font-normal text-default-500 z-999 pb-10 text-center">
                <Copyright />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Register;
