import React, { useState } from "react";
import SidebarItem from "./SidebarItem";
import type { SidebarDataType } from "@/constants";

interface SidebarMenuProps {
  data: SidebarDataType[];
  open: boolean;
}

export default function SidebarMenu({ data, open }: SidebarMenuProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleItemClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <ul className="flex flex-col gap-2 items-start justify-center px-1 w-full bg-white remove-scrollbar">
      {data.map((item, index) => (
        <SidebarItem
          key={item.title}
          data={item}
          open={open}
          isOpen={openIndex === index}
          handleClick={() => handleItemClick(index)}
        />
      ))}
    </ul>
  );
}
