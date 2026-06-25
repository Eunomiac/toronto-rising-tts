"use strict";

const fs = require("fs");
const path = require("path");

const p = path.join(__dirname, "../../ui/.templates/panel_right_sidebar_referenceLayer.xml");
let xml = fs.readFileSync(p, "utf8");
const start = xml.indexOf('<VerticalLayout id="page_2_left_@@color@@"');
const end = xml.indexOf('<Image id="playerHud_navigate_page2_prev_@@color@@"');
if (start < 0 || end < 0) {
  throw new Error("page_2 section markers not found");
}

const replacement = `      <VerticalLayout id="page_2_left_@@color@@" class="page page_left">

        <!-- Domain Backgrounds -->
        ##IF @@HAS_DOMAIN_BACKGROUNDS@@##
        <Image id="divider_domainBackgrounds_@@color@@" image="divider_domainBackgrounds" class="divider_image" />
        <HorizontalLayout class="box_column_container">
          <VerticalLayout class="box_column">@@DOMAIN_BACKGROUNDS_COLUMN_1@@</VerticalLayout>
          <VerticalLayout class="box_column">@@DOMAIN_BACKGROUNDS_COLUMN_2@@</VerticalLayout>
          <VerticalLayout class="box_column">@@DOMAIN_BACKGROUNDS_COLUMN_3@@</VerticalLayout>
        </HorizontalLayout>
        ##ENDIF##

        <!-- Domain Claims -->
        <Image id="divider_domainClaims_@@color@@" image="divider_domainClaims" class="divider_claims_image" raycastTarget="true" onMouseEnter="HUD_playerPrincesCourt_domainClaimsDivider_hoverOn" onMouseExit="HUD_playerPrincesCourt_domainClaimsDivider_hoverOff" />

        <!-- Domain Merits -->
        ##IF @@HAS_DOMAIN_MERITS@@##
        <Image id="divider_domainMerits_@@color@@" image="divider_domainMerits" class="divider_image" />
        <HorizontalLayout class="box_column_container">
          <VerticalLayout class="box_column">@@DOMAIN_MERITS_COLUMN_1@@</VerticalLayout>
          <VerticalLayout class="box_column">@@DOMAIN_MERITS_COLUMN_2@@</VerticalLayout>
          <VerticalLayout class="box_column">@@DOMAIN_MERITS_COLUMN_3@@</VerticalLayout>
        </HorizontalLayout>
        ##ENDIF##


        <!-- Domain Flaws -->
        ##IF @@HAS_DOMAIN_FLAWS@@##
        <Image id="divider_domainFlaws_@@color@@" image="divider_domainFlaws" class="divider_image" />
        <HorizontalLayout class="box_column_container">
          <VerticalLayout class="box_column">@@DOMAIN_FLAWS_COLUMN_1@@</VerticalLayout>
          <VerticalLayout class="box_column">@@DOMAIN_FLAWS_COLUMN_2@@</VerticalLayout>
          <VerticalLayout class="box_column">@@DOMAIN_FLAWS_COLUMN_3@@</VerticalLayout>
        </HorizontalLayout>
        ##ENDIF##

      </VerticalLayout>

      <VerticalLayout id="page_2_right_@@color@@" class="page page_right" padding = "0 0 200 0">

        <!-- Haven Backgrounds -->
        ##IF @@HAS_HAVEN_BACKGROUNDS@@##
        <Image id="divider_havenBackgrounds_@@color@@" image="divider_havenBackgrounds" class="divider_image" />
        <HorizontalLayout class="box_column_container">
          <VerticalLayout class="box_column">@@HAVEN_BACKGROUNDS_COLUMN_1@@</VerticalLayout>
          <VerticalLayout class="box_column">@@HAVEN_BACKGROUNDS_COLUMN_2@@</VerticalLayout>
          <VerticalLayout class="box_column">@@HAVEN_BACKGROUNDS_COLUMN_3@@</VerticalLayout>
        </HorizontalLayout>
        ##ENDIF##

        <!-- Haven Merits -->
        ##IF @@HAS_HAVEN_MERITS@@##
        <Image id="divider_havenMerits_@@color@@" image="divider_havenMerits" class="divider_image" />
        <HorizontalLayout class="box_column_container">
          <VerticalLayout class="box_column">@@HAVEN_MERITS_COLUMN_1@@</VerticalLayout>
          <VerticalLayout class="box_column">@@HAVEN_MERITS_COLUMN_2@@</VerticalLayout>
          <VerticalLayout class="box_column">@@HAVEN_MERITS_COLUMN_3@@</VerticalLayout>
        </HorizontalLayout>
        ##ENDIF##

        <!-- Haven Flaws -->
        ##IF @@HAS_HAVEN_FLAWS@@##
        <Image id="divider_havenFlaws_@@color@@" image="divider_havenFlaws" class="divider_image" />
        <HorizontalLayout class="box_column_container">
          <VerticalLayout class="box_column">@@HAVEN_FLAWS_COLUMN_1@@</VerticalLayout>
          <VerticalLayout class="box_column">@@HAVEN_FLAWS_COLUMN_2@@</VerticalLayout>
          <VerticalLayout class="box_column">@@HAVEN_FLAWS_COLUMN_3@@</VerticalLayout>
        </HorizontalLayout>
        ##ENDIF##

      </VerticalLayout>

      `;

xml = xml.slice(0, start) + replacement + xml.slice(end);
fs.writeFileSync(p, xml);
console.log("[patch_page2_template] HAS_DOMAIN_BACKGROUNDS:", xml.includes("HAS_DOMAIN_BACKGROUNDS"));
