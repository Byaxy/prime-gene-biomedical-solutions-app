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
import { formatCurrency } from "@/lib/utils";
import SignatureAndBankSection from "../pdf-template/SignatureAndBankSection";
import PDFFooter from "../pdf-template/PDFFooter";
import PDFTittle from "../pdf-template/PDFTittle";
import PDFHeader from "../pdf-template/PDFHeader";
import Address from "../pdf-template/Address";
import { Country } from "country-state-city";

// styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 20,
    fontSize: 10,
    color: "#072a69",
    fontFamily: "Times-Roman",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 8,
    paddingVertical: 2,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#002060",
    fontWeight: "bold",
    color: "#00fdff",
    fontSize: 9,
    paddingVertical: 4,
  },
  evenRow: {
    backgroundColor: "#E8E9E9",
  },
  col1: { width: "5%", paddingHorizontal: 5 },
  col2: { width: "8%" },
  col3: { width: "59%" },
  col4: { width: "8%", paddingHorizontal: 10 },
  col5: { width: "10%" },
  col6: { width: "10%" },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  summary: {
    marginTop: 20,
    alignSelf: "flex-end",
    width: "40%",
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
});

const SaleInvoice = ({
  sale,
  currencySymbol,
}: {
  sale: SaleWithRelations;
  currencySymbol: string;
}) => {
  const { sale: sal, customer, products } = sale;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader />
        {/* Title */}
        <PDFTittle title="INVOICE" />

        {/* Invoice Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginVertical: 20,
            gap: 40,
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              flex: 1,
              gap: 10,
            }}
          >
            <Image
              src="/assets/images/qrcode.png"
              style={{ width: 50, height: 50 }}
            />
          </View>

          <View
            style={{
              display: "flex",
              flexDirection: "row",
              flex: 1,
              gap: 20,
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
                  backgroundColor: "#E8E9E9",
                  paddingVertical: 2,
                }}
              >
                INV #:
              </Text>
              <Text style={{ ...styles.companyInfo, textAlign: "center" }}>
                {sal.invoiceNumber || "N/A"}
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
                  backgroundColor: "#E8E9E9",
                  paddingVertical: 2,
                }}
              >
                Date:
              </Text>
              <Text style={{ ...styles.companyInfo, textAlign: "center" }}>
                {new Date(sal.saleDate).toLocaleDateString()}
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
            addressTitle="Billing Address:"
            name={customer.name}
            address={customer.address.address}
            addressName={customer.address.addressName}
            phone={customer.phone}
            email={customer.email}
            city={customer.address.city}
            country={Country.getCountryByCode(customer.address.country)?.name}
          />

          {sal.isDeliveryAddressAdded ? (
            <Address
              addressTitle="Delivery Address:"
              name={sal.deliveryAddress.addressName}
              address={sal.deliveryAddress.address}
              addressName={sal.deliveryAddress.addressName}
              phone={sal.deliveryAddress.phone}
              email={sal.deliveryAddress.email}
              city={sal.deliveryAddress.city}
              country={
                Country.getCountryByCode(sal.deliveryAddress.country)?.name
              }
            />
          ) : (
            <Address
              addressTitle="Delivery Address:"
              name={customer.name}
              address={customer.address.address || ""}
              addressName={customer.address.addressName || ""}
              phone={customer.phone || ""}
              email={customer.email || ""}
              city={customer.address.city || ""}
              country={Country.getCountryByCode(customer.address.country)?.name}
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
                  currencySymbol
                )}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Discount:</Text>
              <Text>
                {formatCurrency(
                  String(sal.discountAmount.toFixed(2)),
                  currencySymbol
                )}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Total Tax:</Text>
              <Text>
                {formatCurrency(
                  String(sal.totalTaxAmount.toFixed(2)),
                  currencySymbol
                )}
              </Text>
            </View>
            <View style={{ ...styles.summaryRow, fontWeight: "bold" }}>
              <Text>Grand Total ({currencySymbol}):</Text>
              <Text>
                {formatCurrency(
                  String(sal.totalAmount.toFixed(2)),
                  currencySymbol
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

export default SaleInvoice;
