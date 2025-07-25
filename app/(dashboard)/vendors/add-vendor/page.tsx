"use client";

import VendorForm from "@/components/forms/VendorForm";
import PageWraper from "@/components/PageWraper";

const AddVendor = () => {
  return (
    <PageWraper title="Add Vendor">
      <section className="space-y-6">
        <VendorForm mode={"create"} />
      </section>
    </PageWraper>
  );
};

export default AddVendor;
