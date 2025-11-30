function login() {
  let email = document.getElementById("email").value;
  let pass = document.getElementById("password").value;

  if (email === "" || pass === "") {
    alert("Please fill all fields");
  } else {
    window.location.href = "dashboard.html";
  }
}
