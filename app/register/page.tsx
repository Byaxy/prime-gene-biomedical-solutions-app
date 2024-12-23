import CreateUserForm from "@/components/forms/CreateUserForm";
import React from "react";

const RegisterPage = () => {
  return (
    <div className="flex h-screen max-h-screen items-center justify-center">
      <div className="sub-container max-w-[496px]">
        <CreateUserForm />
      </div>
    </div>
  );
};

export default RegisterPage;
