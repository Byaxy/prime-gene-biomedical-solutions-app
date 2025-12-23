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
import { formatCurrency, formatDateTime } from "@/lib/utils";
import SignatureAndBankSection from "../pdf-template/SignatureAndBankSection";
import PDFFooter from "../pdf-template/PDFFooter";
import { ProductWithRelations, ReceivedPurchaseWithRelations } from "@/types";
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
    fontSize: 8,
    paddingVertical: 2,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#819AC2",
    fontWeight: "bold",
    color: "#000",
    fontSize: 9,
    paddingVertical: 4,
  },
  evenRow: {
    backgroundColor: "#D5DCE4",
  },
  col1: { width: "5%", paddingHorizontal: 5 },
  col2: { width: "10%" },
  col3: { width: "50%" },
  col4: { width: "8%", paddingHorizontal: 10 },
  col5: { width: "7%" },
  col6: { width: "10%" },
  col7: { width: "10%" },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  summary: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: "25%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  tableContainer: {
    flexGrow: 1,
  },
  pageBreakAvoidContainer: {
    marginTop: "auto",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
});

const ReceivedInventoryPDF = ({
  purchase,
  companySettings,
  allProducts,
}: {
  purchase: ReceivedPurchaseWithRelations;
  allProducts: ProductWithRelations[];
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
  const { receivedPurchase, products } = purchase;
  const config = getCompanyConfig();
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

        {/* Info */}
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
            <Text style={styles.title}>PURCHASE RECEIPT</Text>
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
                {formatDateTime(receivedPurchase.receivingDate).dateOnly}
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
                VPLN #:
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {receivedPurchase.vendorParkingListNumber || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Products Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.col1}>S/N</Text>
            <Text style={styles.col2}>PID</Text>
            <Text style={styles.col3}>Product Description</Text>
            <Text style={styles.col4}>Qnty</Text>
            <Text style={styles.col5}>U/M</Text>
            <Text style={styles.col6}>Cost Price</Text>
            <Text style={styles.col7}>Sub-Total</Text>
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
              <Text style={styles.col4}>
                {product.inventoryStock.reduce((a, b) => a + b.quantity, 0)}
              </Text>
              <Text style={styles.col5}>
                {
                  allProducts.find((p) => p.product.id === product.productId)
                    ?.unit.code
                }
              </Text>
              <Text style={styles.col6}>
                {formatCurrency(
                  String(product.costPrice.toFixed(2)),
                  companySettings.currencySymbol
                )}
              </Text>
              <Text style={styles.col7}>
                {formatCurrency(
                  String(product.totalCost.toFixed(2)),
                  companySettings.currencySymbol
                )}
              </Text>
            </View>
          ))}
          {/* Summary */}
          <View style={styles.summary} wrap={false}>
            <View style={{ ...styles.summaryRow, fontWeight: "bold" }}>
              <Text>Grand Total:</Text>
              <Text style={{ width: "40%" }}>
                {formatCurrency(
                  String(receivedPurchase.totalAmount.toFixed(2)),
                  companySettings.currencySymbol
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <SignatureAndBankSection />
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default ReceivedInventoryPDF;
