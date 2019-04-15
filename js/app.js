function error (e, tab) {
  $('#' + tab + '_results').hide();
  $('#' + tab + ' .flash h4').html(e.name || 'Error');
  $('#' + tab + ' .flash p').html(e.message || e);
  $('#' + tab + ' .flash').show();
}

function serialize (obj) {
  return JSON.stringify(obj, undefined, 2);
}

// Track tab in URL
// see http://stackoverflow.com/questions/12131273/twitter-bootstrap-tabs-url-doesnt-change
$(function(){
  var hash = window.location.hash;
  hash && $('.navbar-nav a[href="' + hash + '"]').tab('show');

  $('.navbar-nav a').click(function (e) {
    $(this).tab('show');
    var scrollmem = $('body').scrollTop();
    window.location.hash = this.hash;
    $('html,body').scrollTop(scrollmem);
  });
});

// Generate
$(function () {
  $('#btn_generate').on('click', function (e) {
    e.preventDefault();
    $('#generate .flash').hide();

    // set network environment
    aproof.setNetwork($('#generate_network').val());

    var private_keys = $('#private_keys').val().split(',');
    private_keys.forEach(function (val, i) { private_keys[i] = val.trim(); });
    var message = $('#message').val();
    var blockhash = $('#blockhash').val();

    var proof = aproof.signAll(private_keys, message, blockhash);

    $('#asset_proof').html(serialize(proof));

    $('#generate_results').show();
  });
});

// Verify
$(function () {
  $('#btn_verify').on('click', function (e) {
    e.preventDefault();
    $('#verify .flash').hide();
    
    let proof = '';
    let res = false;
    let errorMsg = '';
    let isMultisig = false;
    try {
      // set network environment
      const networkInputValue = $('#verify_network').val();
      aproof.setNetwork(networkInputValue);

      // convert proof to object
      proof = JSON.parse($('#asset_proof_verify').val());

      // set multisig flag
      if(proof.redeemScript) isMultisig = true;

      //
      // Only in case of multisig check
      //
      if(isMultisig) {
        // decode redeem script
        const decodeScriptResopnse = aproof.decodeRedeemScript(proof.redeemScript);

        if(decodeScriptResopnse) {
          // check if address is same, only for mainnet
          if(networkInputValue === 'mainnet' && proof.address !== decodeScriptResopnse.address) throw new Error('Address from redeem script didn\'t match');

          proof.reqSigs = decodeScriptResopnse.signaturesRequired;
          proof.addressArray = decodeScriptResopnse.addressArray;

          // verify now
          res = aproof.verifySignatures(proof);
        }
      }
      //
      // each signature check
      //
      else {
        res = aproof.verifySignatures(proof);
      }
    }
    catch(e) {
      errorMsg = e.message;
    }

    // show messages depending on response
    let html = '';
    if (res) {
      html = 'Proof verified successfuly!';
      $('#verification').removeClass('alert-danger').addClass('alert-success').html(html);
    }
    else {
      html += 'Verification failed!';
      if(errorMsg) html += ', Reason - ' + errorMsg;

      $('#verification').removeClass('alert-success').addClass('alert-danger').html(html);
    }

    $('#verification').html(html);
    $('#verify_results').show();

    // Get addresses if not multisig
    let addresses;
    if(!isMultisig) {
      addresses = aproof.getAddresses(proof);
    }
    // for multisig
    else {
      addresses = proof.address;
    }

    // Get address balance
    let balance = 0;
    aproof.getBalance(addresses, proof.blockhash, isMultisig)
      .then(function (balanceResponse) {
        balance = balanceResponse;
      })
      .catch(function (error) {
        console.error(error);
      })
      .finally(function () {
        html += '<br><br><strong>Balance: </strong>' + balance + ' BTC';
        $('#verification').html(html);
      });
  });
});

// Initialize
$(function () {
  $('#btn_generate').trigger('click');
});
