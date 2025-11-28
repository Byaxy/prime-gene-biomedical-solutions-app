import Link from "next/link";

const CommissionPaymentsBtn = () => {
  return (
    <Link
      href={"/accounting-and-finance/commissions/payments"}
      prefetch={true}
      className="shad-primary-btn flex flex-row items-center justify-center gap-1 px-4 py-2 rounded-md shadow-sm text-sm"
    >
      Commission Payments
    </Link>
  );
};

export default CommissionPaymentsBtn;
