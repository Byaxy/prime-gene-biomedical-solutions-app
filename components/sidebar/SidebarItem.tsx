import React from "react";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

import type { SidebarDataType } from "@/constants";
import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import SidebarMenu from "./SidebarMenu";

type SidebarItemProps = {
  data: SidebarDataType;
  open: boolean;
  isOpen?: boolean;
  handleClick?: () => void;
};

export default function SidebarItem({
  data,
  isOpen,
  open,
  handleClick,
}: SidebarItemProps) {
  const pathname = usePathname();

  return (
    <li className="w-full flex flex-col items-center cursor-pointer gap-2 bg-white">
      <Link
        href={data.path}
        onClick={handleClick}
        className={clsx(
          "w-full flex flex-row gap-2 items-center justify-start  hover:text-green-200 hover:bg-blue-800 border-0 rounded-md px-2 py-[6px] cursor-pointer",
          {
            "text-green-200 bg-blue-800": pathname === data.path,
            "text-blue-800 bg-white": pathname !== data.path,
          }
        )}
      >
        <span>{data.icon}</span>
        {data.subCategories && data.subCategories.length !== 0 ? (
          <div
            className={clsx(
              `w-full flex flex-row gap-4
           items-center justify-between font-medium`,
              { "opacity-100": open, hidden: !open }
            )}
          >
            <span>{data.title}</span>
            {isOpen ? (
              <span>
                <KeyboardArrowDownIcon />
              </span>
            ) : (
              <span>
                <KeyboardArrowRightIcon />
              </span>
            )}
          </div>
        ) : (
          <span
            className={clsx("font-medium", {
              "opacity-100": open,
              hidden: !open,
            })}
          >
            {data.title}
          </span>
        )}
      </Link>
      {isOpen && data.subCategories && (
        <div className="w-full ml-6">
          <SidebarMenu data={data.subCategories} open={open} />
        </div>
      )}
    </li>
  );
}
