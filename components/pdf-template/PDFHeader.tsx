/* eslint-disable jsx-a11y/alt-text */
import { getCompanyConfig } from "@/lib/config/company-config";
import { Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  title: {
    fontSize: 21,
    fontWeight: "bold",
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 12,
    marginBottom: 2,
  },
});

const PDFHeader = () => {
  const config = getCompanyConfig();

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 20,
        gap: 18,
        color: "#002060",
      }}
      fixed
    >
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <Image src={config.pdfHeader.logo} style={{ width: 130, height: 90 }} />
        <Text
          style={{
            fontSize: 10,
            fontWeight: "bold",
            marginBottom: 2,
          }}
        >
          Legacy of Quality Par Excellence
        </Text>
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
        }}
      >
        <Text style={styles.title}>{config.pdfHeader.name}</Text>
        <Text style={styles.companyInfo}>{config.pdfHeader.addressLine1}</Text>
        <Text style={styles.companyInfo}>{config.pdfHeader.addressLine2}</Text>
        <Text style={styles.companyInfo}>{config.pdfHeader.phone}</Text>
        <Text style={styles.companyInfo}>{config.pdfHeader.email}</Text>
        <Text style={styles.companyInfo}>{config.pdfHeader.website}</Text>
      </View>
    </View>
  );
};

export default PDFHeader;
