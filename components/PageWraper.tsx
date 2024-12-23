"use client";

import { Button } from "./ui/button";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";

const PageWraper = ({
  title,
  buttonText,
  buttonAction,
  children,
}: {
  title: string;
  buttonText: string;
  buttonAction: () => void;
  children: React.JSX.Element;
}) => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-between w-full gap-5">
        <h3 className="text-2xl md:text-3xl font-bold">{title}</h3>
        <div className="flex flex-col w-full sm:w-fit sm:flex-row items-start sm:items-center justify-start sm:justify-center gap-5">
          <Button
            onClick={router.back}
            className="shad-gray-btn flex flex-row items-center justify-center gap-1"
          >
            <ArrowBackIcon className="h-6 w-6" />
            <span className=" font-medium capitalize">Back</span>
          </Button>
          <Button
            onClick={buttonAction}
            className="shad-primary-btn flex flex-row items-center justify-center gap-1"
          >
            <AddIcon className="h-6 w-6" />
            <span className="text-white font-medium capitalize">
              {buttonText}
            </span>
          </Button>
        </div>
      </div>
      <div className="w-full">{{ ...children }}</div>
    </div>
  );
};

export default PageWraper;
