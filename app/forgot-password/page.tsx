import { Button } from "@/components/ui/button";
import Link from "next/link";

const ForgotPassword = () => {
  return (
    <div className="flex flex-col gap-5 container">
      Forgot Password page
      <Link href="/login">
        <Button className="shad-primary-btn">Login</Button>
      </Link>
    </div>
  );
};

export default ForgotPassword;
