import AddIcon from "@mui/icons-material/Add";
import Link from "next/link";
import BackButton from "./BackButton";

interface Props {
  title: string;
  buttonText?: string;
  buttonAction?: React.ReactNode;
  buttonPath?: string;
  children: React.JSX.Element;
}

const PageWraper = ({
  title,
  buttonText,
  buttonAction,
  buttonPath,
  children,
}: Props) => {
  return (
    <section className="flex flex-col gap-5 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-between w-full gap-5">
        <h3 className="text-2xl font-bold">{title}</h3>
        <div className="flex w-full sm:w-fit flex-row items-start sm:items-center justify-between sm:justify-center gap-5">
          <BackButton />

          {buttonPath && (
            <Link
              href={buttonPath}
              prefetch={true}
              className="shad-primary-btn flex flex-row items-center justify-center gap-1 px-4 py-2 rounded-md shadow-sm text-sm"
            >
              <AddIcon className="h-4 w-4" />
              <span className="text-white font-medium capitalize">
                {buttonText}
              </span>
            </Link>
          )}

          {buttonAction}
        </div>
      </div>
      <div className="w-full">{{ ...children }}</div>
    </section>
  );
};

export default PageWraper;
