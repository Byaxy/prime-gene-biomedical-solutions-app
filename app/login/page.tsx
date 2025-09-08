"use client";

import LoginForm from "@/components/forms/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const LoginPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  if (user) {
    router.replace("/");
  }

  const { companySettings } = useCompanySettings();

  return (
    <section className="flex items-center justify-center h-screen w-full">
      <div className="flex items-center justify-center w-full h-full bg-primaryLight px-4">
        <div className="mx-auto w-full max-w-xl bg-white rounded-xl px-5 py-10 sm:py-16 sm:px-10 shadow-lg">
          <div className="mb-4 flex justify-center items-center p-2 rounded-lg">
            <Image
              src={companySettings?.logoUrl || "/assets/logos/logoWhite.png"}
              alt="Logo"
              width={200}
              height={50}
              priority
            />
          </div>

          <LoginForm />

          <div className="text-14-regular mt-12 flex flex-wrap gap-2 justify-between">
            <span className="justify-items-end text-dark-600 xl:text-left">
              © 2024 {companySettings?.name}.
            </span>
            <Link href="/forgot-password" className="text-blue-700 underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
