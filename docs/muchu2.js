
var txt = [
	{orig: "Muchu_siger_h_h_h_h_h_h_h_h_h_h_h_h_h_h", cipher: "yXYHX71SA7bfF_h_Y_F_h_Y_F_h_Y_F_h_Y_F_h"},
	{orig: "I_juli_passede_vi_geo.muchu_igen._Denne_cache_blev_placeret_sammen_med_Muchu_den_", cipher: "R_D1cG8Z.2Va7n73S_FnI_WO7YK9Sk7ee.K.me.8l.6Ya_rl7ffUc65nL7df3jCnnH.W.6_o1lF2_d7ef"},
	{orig: "sidste_dag_vi_passede_ham._Mens_vi_gik_ture_fandt_vi_et_sjovt_bogstav_som_skulle_", cipher: "2SZ2da8t.H_LF_NbVM6te8Y.n3fznD3_LF_EHUf1Xr6_faed3_rG_e3_oHRv0_7XQI3jr9Vsn_MnXBnn7"},
	{orig: "have_ledt_til_cachen_til_en_lille_multi._Men_jeg_er_holder_en_pause_med_at_lave_den_", cipher: "Hjr7_F7tN9dmm_4ZlF7ef3Sh_nn9cmmc6_Wuldi._M7efFnk9nv9Ysmt6W_.l_tbXM7_G7tfbdfnjr6_d7ef"},
	{orig: "slags_cacher_da_de_skaber_for_mange_problemer.__", cipher: "0caHVb6jYFnr8t..t._VkareW__XbbnjHHnbVboac.lnP__f"},
	{orig: "I_stedet_kan_du_dekode_Muchus_kode_og_finde_andet_trin_her__", cipher: "T_I2n57dfnjD_tu.t.mRZ6_M1lF3VfmRZ5_MG_bGed4_emt.3_pXSn.Y.X__"},
	{orig: "Muchus_kode_er_100_procent_hjemmelavet_men_inspireret_af_andre_koder._Koder_som_er__", cipher: "yXYHXo9Us7n77bfv0w9ZvWland_Ga6mWenjr7dfnnH_Sn1ZCVnv7dfbvfaedXn_mRZ7be9Ds5nr9Vsm_eX__"},
	{orig: "meget_meget_simplere_end_RSA_og_Lorenz.", cipher: "lnE7dflnE7df3SCWc6Xn_6ed8o2B_IE_LWban6."},
	{orig: "Den_adlyder_ikke_Kerckhoffs_princip_som_siger_at__a_cryptosystem_should_be_secure", cipher: "Dnn.j9my57bfHUE4_O6bclYI7vs9ZvGecHZf3RC9VmFnL_jt8_.9lvPZNVVS2dan_MHRqnt7bn_2nY2be"},
	{orig: "even_if_everything_about_the_system_except_the_key_is_public_knowledge__", cipher: "6fel_m6_.1nvNdFFeE8j_XXJ9dl7_MPVN7Wf64c7ZN9dl7_E7yfHVfUX7mS4_UnXwB5tE7_f"},
	{orig: "Der_er_en_slags_key_men_nok_ca_67_procent_af_krypokraften_kommer_fra_at_", cipher: "Bnv9nv_nn_VlbQM.U.P_G7efnRk8l.9z_9ZvWland_bvflbSXRgWj_3nj9UsmWeW__Xj_bdf"},
	{orig: "systemet_ikke_er_kendt._", cipher: "3yI3ni7dfHUE6_eX_k6ed337"},
	{orig: "Normalt_plejer_jeg_at_betateste_mine_egne_opgaver_ved_at_lade_et_program_genere_en__", cipher: "xRrnjF1_plnj7bfFnk_jt.r.3jp7VN7_GGee9nknn_VZAafeX_v7tfbdfmj56_e1_pVRkXjm.Q.lnv6_en__"},
	{orig: "ukendt_udgave._Men_det_er_ikke_en_mulighed_her_da_det_underliggende_system_er_", cipher: "2Uentt.X9HjL73fznD.t.2_6V_mmUa_nn_WulSgGn5.Y.W_9a_d7df2ed7bFFQE6ed7_MPVN7Wf7bf"},
	{orig: "hovedsagen._Hvis_opgaven_er_meget_vanskelige_vil_der_komme_vink_en_gang_imellem._", cipher: "HRr7tMaQen3_hfm1_IUQ63nn9nv.W.HnJ8f.nVk5cGHnb3Sl.t.X_kXWC7_PHeE_nn8Q.nQ_GWemc6n3f"},
	{orig: "Cachen_indeholder_fra_start_logbog_FCC_JFCC_SFFC_dvs_seniorFFC_og_DFFC_til_nummer_1_hund._", cipher: "CjcHnj_Sn5nhWcZ7bf4b._VtbbN9csFrIG_BDCfQMiA_WgMi_tv3_I5eGWbBjC7XQbCMlD_NHcfnXmlnP_8_HXj737"},
	{orig: "Hunden_skal_bare_med._Den_skal_ikke_selv_finde_cachen.", cipher: "jXn7nj_VkbcfZjv7_G7te.K.n_snjB_Sknnb3nB2__Ged6_cZlF7ee"},
	{orig: "Lille_Emma_har_matematik_i_1._klasse_hos_Hanne._", cipher: "TSlnn7jWCZ_FbbfnjN4We3Sg_S_v37kca2Va9Ys2_DbeH73f"},
	{orig: "Hanne._Emma_kan_du_siger_mig..._To_tvillinger_kommer_til_verden._Freja_kl_13.20_og_Vibeke_kl_13.48._Hvem_af_dem_kommer_som_nummer_1..._", cipher: "jjnnn._EmnjfnjD_tu9VmFnL9WmH3a8_XX_J3SlnSjFnL9UsmWeX_tHcf1nv7nj._FVnnb_En_xv32t_IG_RGrennbncbv.6f1a_Ov7Wfbvf7ni9UsmWeX_sXWbnXmlnP_8._3f"},
	{orig: "Emma._De_kom_begge_to_som_nummer_1._", cipher: "jWCb3fDn_nRC.r.GQa9ds9Vsn_H3WG7bfv37"},
	{orig: "Hvem_vandt_Tour_de_France_i_1996..._", cipher: "if.n_Paed0_zVXL.t.9Mvaec5_G_89_z6_3f"},
	{orig: "Bjarne_Riis__Jan_Ullrich__Richard_Virenque_kom_alle_sammen_som_nummer_1._Samtidig", cipher: "Aa6We.9omHVf8J.m_0lcrFlF8_1FlFabd9smXnnWXe9Usk_emc68V.mWen_sXWbnXmlnP_8.8i.ldG5Sg"},
	{orig: "med_Riis_kom_i_over_stregen_kom_Jan_Ullrich_1_minut_senere._De_kom_begge_som_nummer_1._", cipher: "mnd9omHVfnRC_S_WfaX_s2b6HnD9Usk_NbefrcBWS8H_x9WmnXt.V.lnv73fDn_nRC.r.GQa9Vsn_H3WG7bfv37"},
	{orig: "Kan_I_se_hvor_jeg_vil_hen..._Den_der_skriver_som_nummer_1_i_logbogen_er_FTF.__", cipher: "TjH_B_3nbFfoV_n7Qf3Sl.Y.n3.8_H7ef5nr_VkXSv7bf3RC_eumWeX_1_S_lRgZRk7ef7bfiqh__f"}
	];

var coor = "x559x99zd__7j_Rv_Wv3dvxf";

var base64 = ["A","B","C","D","E","F","G","H","I","J","K","L","M",
	"N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
	"a","b","c","d","e","f","g","h","i","j","k","l","m",
	"n","o","p","q","r","s","t","u","v","w","x","y","z",
	"0","1","2","3","4","5","6","7","8","9",".","_"];  // . and _ assumed, could be reverse.

//Let's build the array of options
var bitArray = [];


function base64Value(c) {
	for (var i = 0; i < base64.length; i++) {
		if (c == base64[i])
			return i;
	}
	return null;
}

function valueToBase64(v) {
	return base64[v];
}

function base64AsBin(c) {
	var binString = base64Value(c).toString(2);

	return ("0000000000" + binString).slice(-6);
}

function numBitsSet(s) {
	var r = 0;
	for (var i = 0; i < s.length; i++) {
		if (s[i] == "1")
			r++;
	} 
	return r;
}

function reduceArray(blockOrig, blockCipher) {
	for (var i = 0; i < 18; i++) {
		for (var j = 0; j < 18; j++) {
			if (blockOrig[i] != blockCipher[j]) {
				// Do we need to take it out?
				var x = bitArray[i].indexOf(j);
				//		console.log(x);
				if (x != -1) {
					bitArray[i].splice(x, 1);

					if (bitArray[i].length == 0) {
						console.log("SHIT. Array is now empty for position" + i);
						console.log(bitArray);
						process.exit(1);
					}
				}	
			}
		}		
	}
}

for (var i = 0; i < 18; i++)  {
	bitArray[i] = new Array(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17);
}


console.log("Origional bitarray:");
console.log(bitArray);

for (var t = 0; t < txt.length; t++) {
	console.log("Line " + t + ", length=" + txt[t].orig);

	for (var c = 0; c < txt[t].orig.length; c = c + 3) {
		var blockOrig = "";
		var blockCipher = "";
		for (var c1 = c; c1 < c + 3; c1++) {
			var oLetter = txt[t].orig[c1];
			var cLetter = txt[t].cipher[c1];

			console.log(c, c1, oLetter, cLetter);

			blockOrig = blockOrig + base64AsBin(oLetter);
			blockCipher = blockCipher + base64AsBin(cLetter);

			reduceArray(blockOrig, blockCipher);
		}

		console.log(blockOrig, numBitsSet(blockOrig));
		console.log(blockCipher, numBitsSet(blockCipher));
		console.log(bitArray);
		console.log("");

	}
}
