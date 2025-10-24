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
import PDFFooter from "../pdf-template/PDFFooter";
import Address from "../pdf-template/Address";
import PDFHeader from "../pdf-template/PDFHeader";
import { formatDateTime } from "@/lib/utils";
import Signature from "../pdf-template/Signature";
import ThankYouNote from "../pdf-template/ThankYouNote";
import TermsAndConditions from "../pdf-template/TermsAndConditions";

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
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
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
  col1: { width: "5%", paddingHorizontal: 5, paddingVertical: 5 },
  col2: { width: "10%", paddingVertical: 5 },
  col3: { width: "50%", paddingVertical: 5 },
  col4: { width: "13%", textAlign: "center", paddingVertical: 5 },
  col5: { width: "12%", textAlign: "center", paddingVertical: 5 },
  col6: { width: "10%", textAlign: "center", paddingVertical: 5 },

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
  detailsSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
});

const DeliveryNote = ({ delivery }: { delivery: DeliveryWithRelations }) => {
  const { delivery: del, customer, sale, products } = delivery;
  const termsAndConditions = [
    "Goods Received in Good Condition.",
    "Items not supplied are captured in the Promissory Note.",
    "By signing above, you agree the terms on this delivery note are correct and accurate, no other terms & conditions shall apply.",
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

        {/* Delivery Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Text style={styles.title}>DELIVERY NOTE</Text>
        </View>

        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 40,
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
              Invoice #
            </Text>
            <Text
              style={{
                ...styles.deliveryInfo,
                textAlign: "center",
                paddingVertical: 2,
                fontWeight: "bold",
              }}
            >
              {sale.invoiceNumber || "N/A"}
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
              Delivery Date
            </Text>
            <Text
              style={{
                ...styles.deliveryInfo,
                textAlign: "center",
                paddingVertical: 2,
                fontWeight: "bold",
              }}
            >
              {formatDateTime(del.deliveryDate).dateOnly}
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
              DN #
            </Text>
            <Text
              style={{
                ...styles.deliveryInfo,
                textAlign: "center",
                paddingVertical: 2,
                fontWeight: "bold",
              }}
            >
              {del.deliveryRefNumber || "N/A"}
            </Text>
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
            addressTitle="Billing Address:"
            name={customer.name}
            address={customer.address?.address ?? ""}
            phone={customer.phone}
            email={customer.email ?? ""}
            city={customer.address?.city ?? ""}
            country={customer.address?.country ?? ""}
          />

          <Address
            addressTitle="Delivery Address:"
            name={del.deliveryAddress.addressName}
            address={del.deliveryAddress.address}
            phone={del.deliveryAddress.phone}
            email={del.deliveryAddress.email}
            city={del.deliveryAddress.city}
            country={del.deliveryAddress.country}
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
          <View wrap={false}>
            {/* Signature */}
            <View style={styles.signatureSection}>
              <Signature title="Sales Manager" />
              <View style={{ marginRight: 20 }}>
                <Signature title="Customer" />
              </View>
            </View>

            <View style={styles.detailsSection}>
              <TermsAndConditions termsAndConditions={termsAndConditions} />
            </View>
          </View>
        </View>

        <ThankYouNote />

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default DeliveryNote;
