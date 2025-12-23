/* eslint-disable jsx-a11y/alt-text */
"use client";

import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { PurchaseOrderWithRelations } from "@/types";
import PDFHeader from "../pdf-template/PDFHeader";
import Address from "../pdf-template/Address";
import { formatDateTime } from "@/lib/utils";
import PDFFooter from "../pdf-template/PDFFooter";
import Signature from "../pdf-template/Signature";
import BankDetails from "../pdf-template/BankDetails";
import TermsAndConditions from "../pdf-template/TermsAndConditions";
import { getCompanyConfig } from "@/lib/config/company-config";
import CompanyAddress from "../pdf-template/CompanyAddress";

// styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 15,
    fontSize: 10,
    color: "#000",
    fontFamily: "Times-Roman",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: "25%",
    left: "15%",
    width: 440,
    height: 420,
    opacity: 0.1,
    zIndex: -1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 10,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#819AC2",
    fontWeight: "bold",
    color: "#000",
    fontSize: 10,
  },
  evenRow: {
    backgroundColor: "#D5DCE4",
  },
  col1: {
    width: "5%",
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  col2: {
    width: "13%",
    paddingVertical: 5,
    paddingRight: 5,
  },
  col3: {
    width: "70%",
    paddingVertical: 5,
  },
  col4: {
    width: "12%",
    textAlign: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  summary: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: "35%",
  },
  tableContainer: {
    flexGrow: 1,
    color: "#000",
  },
  pageBreakAvoidContainer: {
    marginTop: "auto",
  },
  signatureSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
  bankSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
});

interface Props {
  purchaseOrder: PurchaseOrderWithRelations;
  companySettings: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    currencySymbol: string;
  };
}

const PurchaseOrderPDF = ({ purchaseOrder, companySettings }: Props) => {
  const { purchaseOrder: purchase, products, vendor } = purchaseOrder;

  const config = getCompanyConfig();

  const termsAndConditions = [
    "Prices quoted here should be valid for 6 months.",
    "Payment Terms: 100% prepayment EXW.",
    "When a dispute arises over subtotal or total prices, individual unit prices should be considered",
  ];
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Background Image */}
        <Image
          style={styles.backgroundImage}
          src={config.pdfBackgroundImage}
          fixed
        />
        {/* Header */}
        <PDFHeader />
        {/* Title */}

        {/* Invoice Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 20,
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              flex: 2,
            }}
          >
            <Text style={styles.title}>REQUEST FOR QUOTATION</Text>
          </View>

          <View
            style={{
              display: "flex",
              flexDirection: "row",
              flex: 1,
              color: "#000",
            }}
          >
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  backgroundColor: "#819AC2",
                  paddingTop: 2,
                  paddingBottom: 2,
                  fontSize: 10,
                }}
              >
                Date
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {formatDateTime(purchase.purchaseOrderDate).dateOnly}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  backgroundColor: "#819AC2",
                  paddingTop: 2,
                  paddingBottom: 2,
                  fontSize: 10,
                }}
              >
                RQF #
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {purchase.purchaseOrderNumber || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Address Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 80,
          }}
        >
          <Address
            addressTitle="Vendor Address"
            name={vendor.name}
            address={vendor.address.address}
            phone={vendor.phone}
            email={vendor.email}
            city={vendor.address.city}
            country={vendor.address.country}
          />

          <CompanyAddress
            addressTitle="Delivery Address"
            companySettings={companySettings}
          />
        </View>

        {/* Products Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.col1}>S/N</Text>
            <Text style={styles.col2}>PID</Text>
            <Text style={styles.col3}>Product Description</Text>
            <Text style={styles.col4}>Qnty</Text>
          </View>

          {/* Table Rows */}
          {products.map((product, index) => (
            <View
              key={product.id}
              style={[styles.row, index % 2 === 1 ? styles.evenRow : {}]}
            >
              <Text style={styles.col1}>
                {index < 9 ? `0${index + 1}` : index + 1}
              </Text>
              <Text style={styles.col2}>{product.productID}</Text>
              <Text style={styles.col3}>{product.productName}</Text>
              <Text style={styles.col4}>{product.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <View wrap={false}>
            {/* Signature */}
            <View style={styles.signatureSection}>
              <Signature title="Sales Manager" />
              <View style={{ marginRight: 20 }}>
                <Signature title="Customer" />
              </View>
            </View>

            {/* Bank Details - Terms & Conditions */}
            <View style={styles.bankSection}>
              <BankDetails />

              <TermsAndConditions termsAndConditions={termsAndConditions} />
            </View>
          </View>
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default PurchaseOrderPDF;
