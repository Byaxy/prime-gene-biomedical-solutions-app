/* eslint-disable jsx-a11y/alt-text */
"use client";

import { DeliveryWithRelations } from "@/types";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import SignatureAndBankSection from "../pdf-template/SignatureAndBankSection";
import PDFFooter from "../pdf-template/PDFFooter";
import Address from "../pdf-template/Address";
import PDFHeader from "../pdf-template/PDFHeader";
import PDFTittle from "../pdf-template/PDFTittle";
import { Country } from "country-state-city";
import { formatDateTime } from "@/lib/utils";

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
  col3: { width: "50%" },
  col4: { width: "15%", paddingHorizontal: 10 },
  col5: { width: "12%" },
  col6: { width: "10%" },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  deliveryInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  deliveryInfoContainer: {
    display: "flex",
    flexDirection: "row",
    flex: 1,
    gap: 20,
  },
  tableContainer: {
    flexGrow: 1,
  },
  pageBreakAvoidContainer: {
    marginTop: "auto",
  },
});

const DeliveryNote = ({ delivery }: { delivery: DeliveryWithRelations }) => {
  const { delivery: del, customer, sale, products } = delivery;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader />
        {/* Title */}
        <PDFTittle title="Delivery Note" />

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
              flexDirection: "column",
              flex: 1,
              gap: 5,
            }}
          >
            <View style={styles.deliveryInfoContainer}>
              <Text style={{ ...styles.deliveryInfo, flex: 1 }}>
                {"Delivery Date"}
              </Text>
              <Text
                style={{ ...styles.deliveryInfo, fontWeight: "bold", flex: 2 }}
              >
                {formatDateTime(del.deliveryDate).dateTime}
              </Text>
            </View>
            <View style={styles.deliveryInfoContainer}>
              <Text style={{ ...styles.deliveryInfo, flex: 1 }}>
                {"Delivery Ref No."}
              </Text>
              <Text
                style={{ ...styles.deliveryInfo, fontWeight: "bold", flex: 2 }}
              >
                {del.deliveryRefNumber}
              </Text>
            </View>
            <View style={styles.deliveryInfoContainer}>
              <Text style={{ ...styles.deliveryInfo, flex: 1 }}>
                {"Delivery Status"}
              </Text>
              <Text
                style={{ ...styles.deliveryInfo, fontWeight: "bold", flex: 2 }}
              >
                {del.status}
              </Text>
            </View>
            <View style={styles.deliveryInfoContainer}>
              <Text style={{ ...styles.deliveryInfo, flex: 1 }}>
                {"Sale Date"}
              </Text>
              <Text
                style={{ ...styles.deliveryInfo, fontWeight: "bold", flex: 2 }}
              >
                {formatDateTime(sale.saleDate).dateTime}
              </Text>
            </View>
            <View style={styles.deliveryInfoContainer}>
              <Text style={{ ...styles.deliveryInfo, flex: 1 }}>
                {"Invoice Ref No."}
              </Text>
              <Text
                style={{ ...styles.deliveryInfo, fontWeight: "bold", flex: 2 }}
              >
                {sale.invoiceNumber}
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

          <Address
            addressTitle="Delivery Address:"
            name={del.deliveryAddress.addressName}
            address={del.deliveryAddress.address}
            addressName={del.deliveryAddress.addressName}
            phone={del.deliveryAddress.phone}
            email={del.deliveryAddress.email}
            city={del.deliveryAddress.city}
            country={
              Country.getCountryByCode(del.deliveryAddress.country)?.name
            }
          />
        </View>

        {/* Products Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>PID</Text>
            <Text style={styles.col3}>Product Description</Text>
            <Text style={styles.col4}>Qnty Requested</Text>
            <Text style={styles.col5}>Qnty Supplied</Text>
            <Text style={styles.col6}>Balance Left</Text>
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
              <Text style={styles.col4}>{product.quantityRequested}</Text>
              <Text style={styles.col5}>{product.quantitySupplied}</Text>
              <Text style={styles.col6}>{product.balanceLeft}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <SignatureAndBankSection />
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default DeliveryNote;
