"use client"

import { PencilIcon, TrashIcon, EllipsisVertical } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PropertyAsset } from "@/types/propertyStatusAssets";

interface DropdownMenuDestructiveProps {
  asset: PropertyAsset;
  onEdit: (asset: PropertyAsset) => void;
  onDelete: (asset: PropertyAsset) => void;
}

export function DropdownMenuDestructive({
  asset,
  onEdit,
  onDelete,
}: DropdownMenuDestructiveProps) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label="更多物件操作"
          className={buttonVariants({ variant: "ghost", className: "cursor-pointer bg-transparent" })}
       >
          <EllipsisVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="dropdown-menu-content">
          <DropdownMenuGroup>
            <DropdownMenuItem
               className="dropdown-menu-item"
              onClick={() => onEdit(asset)}
            >
              <PencilIcon />
              編輯
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(asset)}>
              <TrashIcon />
              刪除
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
