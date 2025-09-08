import { sidebarData, SidebarDataType } from "@/constants";

function extractPaths(data: SidebarDataType[]): Set<string> {
  const paths = new Set<string>();

  function traverse(items: SidebarDataType[]) {
    for (const item of items) {
      if (item.path && item.path !== "") {
        paths.add(item.path);
      }
      if (item.subCategories && item.subCategories.length > 0) {
        traverse(item.subCategories);
      }
    }
  }

  traverse(data);
  return paths;
}

export const allAppPaths = extractPaths(sidebarData);
