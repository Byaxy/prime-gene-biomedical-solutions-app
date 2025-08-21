"use client";

import { Button } from "./ui/button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";

const BackButton = () => {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.back()}
      className="shad-gray-btn flex flex-row items-center justify-center gap-1 border-0"
    >
      <ArrowBackIcon className="h-6 w-6" />
      <span className="font-medium capitalize">Back</span>
    </Button>
  );
};

export default BackButton;
