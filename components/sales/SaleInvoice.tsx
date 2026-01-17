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
import { SaleWithRelations } from "@/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import PDFFooter from "../pdf-template/PDFFooter";
import PDFHeader from "../pdf-template/PDFHeader";
import Address from "../pdf-template/Address";
import Signature from "../pdf-template/Signature";
import BankDetails from "../pdf-template/BankDetails";
import TermsAndConditions from "../pdf-template/TermsAndConditions";
import { getCompanyConfig } from "@/lib/config/company-config";

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
    width: "40%",
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
    fontWeight: "bold",
    backgroundColor: "#819AC2",
  },
  summaryLabel: {
    paddingRight: 10,
    paddingTop: 4,
    paddingBottom: 4,
    flex: 2,
  },
  summaryValue: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    flex: 1,
    paddingTop: 4,
    paddingBottom: 4,
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

const SaleInvoice = ({
  sale,
  currencySymbol,
}: {
  sale: SaleWithRelations;
  currencySymbol: string;
}) => {
  const { sale: sal, customer, products } = sale;

  const config = getCompanyConfig();

  const termsAndConditions = [
    "Prices quoted here are valid for 6 months.",
    "Terms of payment is 30 days.",
    "This certifies that the invoice is true and correct.",
    "When a dispute arises over subtotal or total prices, individual unit prices should be considered.",
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
            gap: 40,
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              flex: 1.5,
            }}
          >
            <Text style={styles.title}>INVOICE</Text>
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
                {formatDateTime(sal.saleDate).dateOnly}
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
                Invoice #
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {sal.invoiceNumber || "N/A"}
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
            addressTitle="Billing Address"
            name={customer.name}
            address={customer?.address?.address ?? ""}
            phone={customer.phone}
            email={customer.email ?? ""}
            city={customer?.address?.city ?? ""}
            country={customer?.address?.country ?? ""}
          />

          {sal.isDeliveryAddressAdded ? (
            <Address
              addressTitle="Delivery Address"
              name={sal?.deliveryAddress?.addressName ?? ""}
              address={sal?.deliveryAddress?.address ?? ""}
              phone={sal.deliveryAddress?.phone ?? ""}
              email={sal.deliveryAddress?.email ?? ""}
              city={sal.deliveryAddress?.city ?? ""}
              country={sal.deliveryAddress?.country ?? ""}
            />
          ) : (
            <Address
              addressTitle="Delivery Address"
              name={customer.name}
              address={customer?.address?.address ?? ""}
              phone={customer.phone ?? ""}
              email={customer.email ?? ""}
              city={customer?.address?.city ?? ""}
              country={customer?.address?.country ?? ""}
            />
          )}
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
              <Text style={styles.col5}>{product.unitPrice.toFixed(2)}</Text>
              <Text style={styles.col6}>{product.subTotal.toFixed(2)}</Text>
            </View>
          ))}
          {/* Summary */}
          <View style={styles.summary} wrap={false}>
            <View style={styles.summaryRow}>
              <Text>Sub-Total ({currencySymbol}):</Text>
              <Text>
                {formatCurrency(
                  String(sal.subTotal.toFixed(2)),
                  currencySymbol,
                )}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Discount:</Text>
              <Text>
                {formatCurrency(
                  String(sal.discountAmount.toFixed(2)),
                  currencySymbol,
                )}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Tax:</Text>
              <Text>
                {formatCurrency(
                  String(sal.totalTaxAmount.toFixed(2)),
                  currencySymbol,
                )}
              </Text>
            </View>
            <View style={styles.summaryRowWithBorder}>
              <Text style={styles.summaryLabel}>
                Grand Total ({currencySymbol}):
              </Text>
              <View style={styles.summaryValue}>
                <Text>
                  {formatCurrency(
                    String(sal.totalAmount.toFixed(2)),
                    currencySymbol,
                  )}
                </Text>
              </View>
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

export default SaleInvoice;
