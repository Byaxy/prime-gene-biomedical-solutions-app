"use client";

import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

const CommissionPaymentsBtn = () => {
  const router = useRouter();

  const handleClick = () => {
    router.push("/accounting-and-finance/commissions/payments");
  };
  return (
    <Button className="shad-primary-btn" type="button" onClick={handleClick}>
      Commission Payments
    </Button>
  );
};

export default CommissionPaymentsBtn;
