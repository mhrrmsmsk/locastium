import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import logo from '../assets/images/astem-logo.png';
import Icon from 'react-native-vector-icons/Ionicons';
import { Formik } from 'formik';
import * as yup from 'yup';
import { useAuth } from '../auth/authContext';

const LogIn = ({ navigation }) => {
  const { login, userData } = useAuth();

  const loginValidationSchema = yup.object().shape({
    email: yup
      .string()
      .email('Please enter a valid email')
      .required('Email is required'),
    password: yup
      .string()
      .min(4, ({ min }) => `Password must be at least ${min} characters`)
      .required('Password is required'),
  });

  const handleLogin = async (values) => {
    try {
      const result = await login(values.email, values.password);
  
      if (!result) {
        Alert.alert("Giriş Başarısız", "Kullanıcı verisi yüklenemedi.");
        return;
      }
  
      navigation.replace("Tabs"); // başarılı login yönlendirme
  
    } catch (error) {
      console.error("Login error:", error);
  
      if (error.code === "auth/network-request-failed") {
        Alert.alert("Bağlantı Hatası", "İnternet bağlantınızı kontrol edin ve tekrar deneyin.");
      } else if (error.code === "auth/user-not-found") {
        Alert.alert("Kullanıcı Bulunamadı", "Bu e-posta ile kayıtlı bir kullanıcı bulunamadı.");
      } else if (error.code === "auth/wrong-password") {
        Alert.alert("Hatalı Şifre", "Girdiğiniz şifre yanlış.");
      } else if (error.code === "auth/too-many-requests") {
        Alert.alert("Çok Fazla Deneme", "Lütfen daha sonra tekrar deneyin.");
      } else {
        Alert.alert("Giriş Hatası", error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.title}>Giriş Yap</Text>

      <Formik
        validationSchema={loginValidationSchema}
        initialValues={{ email: '', password: '' }}
        onSubmit={handleLogin}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          isValid,
        }) => (
          <>
            <View style={styles.inputContainer}>
              <Icon name="mail-outline" size={25} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                value={values.email}
              />
            </View>
            {errors.email && touched.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
            <View style={styles.inputContainer}>
              <Icon name="lock-closed-outline" size={25} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                secureTextEntry
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                value={values.password}
              />
            </View>
            {errors.password && touched.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={!isValid}>
              <Text style={styles.buttonText}>Giriş Yap</Text>
            </TouchableOpacity>
          </>
        )}
      </Formik>
    </View>
  );
};

export default LogIn;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  logo: {
    height: 350,
    width: 350,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 40,
    fontWeight: 'bold',
    color: 'black',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    color: '#000',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#1E90FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  signUp: {
    color: '#000',
  },
  signUpLink: {
    color: '#1E90FF',
  },
  errorText: {
    color: 'red',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
});