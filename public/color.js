
fetch('./result1.json').then(response => {
    return response.json();
  }).then(data => {
    // Work with JSON data here
    console.log(data);
    document.write("<table class='body'>");
    dkeys = Object.keys(data);
    for (k in dkeys){
        // console.log(data[dkeys[k]]);
        // for (i in data[dkeys[k]]){
        //     console.log(data[dkeys[k]][i]);
        //    }
        document.write("<tr>");
        for (i in data[dkeys[k]]){
            document.write("<td>"+data[dkeys[k]][1]+"</td>");
            document.write("<td>"+data[dkeys[k]][0]+"</td>");
           }
           document.write("</tr>");
    }
document.write("</table>");
    
//   console.log(keys);

  }).catch(err => {
    // Do something for an error here
    console.log(err);
  });


  