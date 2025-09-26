import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { Country } from "country-state-city";

interface AddressProps {
  addressTitle?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
}
const styles = StyleSheet.create({
  addressInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
});

const Address = ({
  addressTitle,
  name,
  address,
  phone,
  email,
  city,
  country,
}: AddressProps) => {
  return (
    <View
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        color: "#000",
      }}
    >
      <View
        style={{
          backgroundColor: "#819AC2",
          paddingTop: 3,
          paddingBottom: 3,
          paddingHorizontal: 5,
        }}
      >
        <Text style={{ fontWeight: "bold", fontSize: 10 }}>
          {addressTitle}:
        </Text>
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          paddingLeft: 10,
          paddingTop: 2,
        }}
      >
        <Text style={{ ...styles.addressInfo, fontWeight: "bold" }}>
          {name}
        </Text>
        <Text style={styles.addressInfo}>
          {city ? `${city} -` : null}{" "}
          {country ? Country.getCountryByCode(country)?.name : null}
        </Text>
        <Text style={styles.addressInfo}>{address ? address : null}</Text>
        <Text style={styles.addressInfo}>{phone ? phone : null}</Text>
        <Text style={styles.addressInfo}>{email ? email : null}</Text>
      </View>
    </View>
  );
};

export default Address;
