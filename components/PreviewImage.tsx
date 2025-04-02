import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useState } from "react";

interface DialogProps {
  imageUrl: string;
}

const PreviewImage = ({ imageUrl }: DialogProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex">
      <Image
        src={imageUrl || "/assets/images/placeholder.jpg"}
        alt={"Image"}
        width={100}
        height={50}
        className="h-12 w-24 rounded-md object-contain cursor-pointer"
        priority={true}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle></DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center w-full">
            <Image
              src={imageUrl || "/assets/images/placeholder.jpg"}
              width={200}
              height={200}
              alt="uploaded image"
              className="max-h-[600px] lg:w-[600px] overflow-hidden object-cover rounded-md"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreviewImage;
