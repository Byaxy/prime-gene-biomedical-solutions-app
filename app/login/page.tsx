"use client";
import LoginForm from "@/components/forms/LoginForm";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LoginPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  return (
    <div className="flex h-screen max-h-screen bg-gradient-to-b from-[#E8E6F3] via-[#F5F2FD] to-[#EAE8F5]">
      <section className="remove-scrollbar container my-auto">
        <div className="sub-container max-w-[496px]">
          <Link href={"/"}>
            <h1 className="text-4xl bg-gradient-to-r to-light-200 from-blue-800 bg-clip-text text-transparent">
              Homeland Interiors
            </h1>
          </Link>

          <LoginForm />

          <div className="text-14-regular mt-20 flex justify-between">
            <p className="justify-items-end text-dark-600 xl:text-left">
              © 2024 Homeland Interiors
            </p>
            <Link href="/forgot-password" className="text-blue-700 underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </section>

      <Image
        src="/assets/images/rods.jpg"
        height={1000}
        width={1000}
        alt="patient"
        className="side-img max-w-[50%] rounded-md"
      />
    </div>
  );
};

export default LoginPage;
