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
import PDFHeader from "../pdf-template/PDFHeader";
import { PurchaseWithRelations } from "@/types";
import Address from "../pdf-template/Address";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import PDFFooter from "../pdf-template/PDFFooter";
import BankDetails from "../pdf-template/BankDetails";
import TermsAndConditions from "../pdf-template/TermsAndConditions";
import Signature from "../pdf-template/Signature";

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
    width: "12%",
    paddingVertical: 5,
    paddingRight: 5,
  },
  col3: {
    width: "55%",
    paddingVertical: 5,
  },
  col4: {
    width: "8%",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  col5: {
    width: "10%",
    paddingVertical: 5,
  },
  col6: {
    width: "10%",
    paddingVertical: 5,
  },
  title: {
    fontSize: 18,
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
    width: "30%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingHorizontal: 5,
    fontWeight: "bold",
  },
  summaryRowWithBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingHorizontal: 5,
    paddingVertical: 4,
    fontWeight: "bold",
    backgroundColor: "#819AC2",
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

const PurchasePDF = ({
  purchase,
  companySettings,
}: {
  purchase: PurchaseWithRelations;
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
}) => {
  const { purchase: purchaseOrder, vendor, products } = purchase;
  const termsAndConditions = [
    "Prices quoted here should be valid for 6 months",
    "Payment Terms: 100% prepayment EXW.",
    "When a dispute arises over subtotal or total prices, individual unit prices should be considered.",
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Background Image */}
        <Image
          style={styles.backgroundImage}
          src="/assets/logos/logo3.jpeg"
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
            gap: 40,
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
            <Text style={styles.title}>PURCHASE ORDER</Text>
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
                {formatDateTime(purchaseOrder.purchaseDate).dateOnly}
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
                PO #
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {purchaseOrder.purchaseNumber || "N/A"}
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
            gap: 40,
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

          <Address
            addressTitle="Billing Address"
            name={companySettings.name.toLowerCase()}
            address={companySettings.address || ""}
            phone={companySettings.phone || ""}
            email={companySettings.email || ""}
            city={companySettings.city || ""}
            country={companySettings.country || ""}
          />

          <Address
            addressTitle="Delivery Address"
            name={companySettings.name.toLowerCase()}
            address={companySettings.address || ""}
            phone={companySettings.phone || ""}
            email={companySettings.email || ""}
            city={companySettings.city || ""}
            country={companySettings.country || ""}
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
            <Text style={styles.col5}>Unit Price</Text>
            <Text style={styles.col6}>Sub-Total</Text>
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
              <Text style={styles.col5}>{product.costPrice.toFixed(2)}</Text>
              <Text style={styles.col6}>{product.totalPrice.toFixed(2)}</Text>
            </View>
          ))}
          {/* Summary */}
          <View style={styles.summary} wrap={false}>
            <View style={styles.summaryRowWithBorder}>
              <Text>Grand Total ({companySettings.currencySymbol}):</Text>
              <Text style={{ width: "32%" }}>
                {formatCurrency(
                  String(purchaseOrder.totalAmount.toFixed(2)),
                  companySettings.currencySymbol
                )}
              </Text>
            </View>
          </View>
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

export default PurchasePDF;
