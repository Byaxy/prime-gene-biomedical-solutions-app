import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Link from "next/link";
import { Button } from "./ui/button";
import { User2Icon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="w-full flex items-center justify-end space-x-4">
      <div className="hidden  sm:flex flex-col justify-center gap-1">
        <span className="text-nowrap font-semibold">{user?.name}</span>
        <span className="text-sm leading-3 text-dark-600">{user?.email}</span>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <User2Icon className="w-10 h-10 bg-light-200 p-2 rounded-full text-blue-800 cursor-pointer" />
        </PopoverTrigger>
        <PopoverContent className="w-72 flex flex-col mt-2 ring-0 gap-4 bg-white z-50">
          <Link href="/settings/profile" onClick={() => setOpen(false)}>
            <Button className="shad-primary-btn font-semibold w-full">
              View Profile
            </Button>
          </Link>
          <Button
            className="shad-danger-btn font-semibold"
            onClick={() => {
              logout();
              setOpen(false);
            }}
          >
            Log Out
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default Header;
