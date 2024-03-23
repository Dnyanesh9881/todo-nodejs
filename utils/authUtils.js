function isEmailRgex({email}) {
  const isEmail =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i.test(
      email
    );
  return isEmail;
}

const userDataValidation = ({ name, email, username, password }) => {
  return new Promise((resolve, reject) => {
    console.log(name, email, username, password);

    if (!name || !email || !username || !password)
      reject("All Fields required");

    if (!isEmailRgex({email: email})) reject("Email format is incorrect");

    resolve();
  });
};

module.exports = { userDataValidation, isEmailRgex };
