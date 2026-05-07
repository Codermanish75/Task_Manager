const handleSubmit = async (e) => {
  e.preventDefault();

  const userData = {
    first_name: firstName,
    last_name: lastName,
    username,
    email,
    password,
    password2: confirmPassword,
  };

  try {
    const data = await registerUser(userData);

    console.log(data);

    alert('Registration successful!');
  } catch (err) {
    alert(err.message);
  }
};