/* eslint-disable jsx-a11y/alt-text */
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import PDFFooter from "../pdf-template/PDFFooter";
import PDFHeader from "../pdf-template/PDFHeader";
import { formatDateTime } from "@/lib/utils";
import { WaybillWithRelations } from "@/types";
import Address from "../pdf-template/Address";
import ThankYouNote from "../pdf-template/ThankYouNote";
import WaybillTermsAndConditions from "../pdf-template/WaybillTermsAndConditions";
import Signature2 from "../pdf-template/Signature2";
import OfficerSignature from "../pdf-template/OfficerSignature";

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
  col2: { width: "12%", paddingVertical: 5 },
  col3: { width: "55%", paddingVertical: 5 },
  col4: { width: "18%", paddingLeft: 10, paddingVertical: 5 },
  col5: { width: "10%", textAlign: "center", paddingVertical: 5 },

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

const WaybillPDF = ({ waybill }: { waybill: WaybillWithRelations }) => {
  const { waybill: bill, sale, products } = waybill;

  console.log("waybill from pdf: ", waybill);

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
          <Text style={styles.title}>WAYBILL</Text>
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
              {sale?.invoiceNumber || "N/A"}
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
              WB Date
            </Text>
            <Text
              style={{
                ...styles.deliveryInfo,
                textAlign: "center",
                paddingVertical: 2,
                fontWeight: "bold",
              }}
            >
              {formatDateTime(bill.waybillDate).dateOnly}
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
              WB #
            </Text>
            <Text
              style={{
                ...styles.deliveryInfo,
                textAlign: "center",
                paddingVertical: 2,
                fontWeight: "bold",
              }}
            >
              {bill.waybillRefNumber || "N/A"}
            </Text>
          </View>
        </View>

        {/* Address Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 30,
          }}
        >
          <Address
            addressTitle="Delivery Address:"
            name={bill.deliveryAddress.addressName}
            address={bill.deliveryAddress.address}
            phone={bill.deliveryAddress.phone}
            email={bill.deliveryAddress.email}
            city={bill.deliveryAddress.city}
            country={bill.deliveryAddress.country}
          />
          <OfficerSignature title="Delivering Officer" />
          <OfficerSignature title="Receiving Officer" />
        </View>

        {/* Products Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.col1}>S/N</Text>
            <Text style={styles.col2}>PID</Text>
            <Text style={styles.col3}>Product Description</Text>
            <Text style={styles.col4}>Lot No.</Text>
            <Text style={styles.col5}>Qnty</Text>
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
              <View style={styles.col4}>
                {product.inventoryStock.map((stock) => (
                  <Text style={{ paddingVertical: 1 }} key={stock.lotNumber}>
                    {stock.lotNumber}
                  </Text>
                ))}
              </View>
              <View style={styles.col5}>
                {product.inventoryStock.map((stock) => (
                  <Text style={{ paddingVertical: 1 }} key={stock.lotNumber}>
                    {stock.quantityTaken}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <View wrap={false}>
            {/* Signature */}
            <View style={styles.signatureSection}>
              <Signature2 title="Sales Manager" />
              <View style={{ marginRight: 20 }}>
                <Signature2 title="Customer" />
              </View>
            </View>

            <View style={styles.detailsSection}>
              <WaybillTermsAndConditions />
            </View>
          </View>
        </View>

        <ThankYouNote />

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default WaybillPDF;
