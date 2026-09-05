import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdInfoOutline } from 'react-icons/md';
import { toast } from 'sonner';
import ActionButton from '../../components/common/ActionButton/ActionButton';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import SettingsItem from '@/components/settings/SettingsItem';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox"
import { Field } from "@/components/ui/field"
import { Label } from "@/components/ui/label"

export default function ReportBugPage() {
    const navigate = useNavigate();

    // Form states
    const [reportType, setReportType] = useState("bug");
    const [relatedSection, setRelatedSection] = useState("");
    const [description, setDescription] = useState("");
    const [isDisability, setIsDisability] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const reportTypes = [
        { label: "خطای عملکردی", value: 'bug' },
        { label: "آسیب‌پذیری امنیتی", value: 'Vulnerability' },
        { label: "پیشنهاد", value: 'suggestion' },
    ]

    const relatedSections = [
        { label: "احراز هویت کاربران", value: "auth" },
        { label: "منوهای برنامه", value: "menus" },
        { label: "تصویربرداری خودکار", value: "camera-auto" },
        { label: "تصویربرداری دستی", value: "camera-manual" },
        { label: "فرایند تبدیل عکس به متن", value: "ocr" },
        { label: "فرایند تبدیل متن به گفتار", value: "tts" },
        { label: "پخش‌کننده داخلی برنامه", value: "player" },
        { label: "تنظیمات", value: "settings" },
        { label: "سایر بخش‌ها", value: "others" },
    ];

    // Validation
    const isFormValid = () => {
        if (!reportType || !relatedSection || description.trim().length <= 0) return false;
        return true
    };

    const handleSubmit = () => {
        if (!isFormValid()) {
            toast.error("لطفاً تمامی فیلدهای الزامی را پر کنید");
            return;
        }

        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            toast.success("گزارش شما با موفقیت ارسال شد. سپاسگزاریم!", {
                duration: 2500,
            });
            // replace: the form page must not stay in history — otherwise
            // going back from /settings would land on the form again
            navigate("/settings", { replace: true });
        }, 1500);
    };

    return (
        <div className="w-full flex flex-col h-full flex-1 justify-between">
            <div className="w-full flex flex-col gap-3">
                <Alert dir="rtl">
                    <AlertTitle className="flex items-center gap-2 mb-2">
                        <MdInfoOutline size="1.5rem" className="shrink-0" />
                        دربارۀ گزارش خطا یا پیشنهاد
                    </AlertTitle>
                    <AlertDescription className="text-slate-300 leading-5">
                        اگر هنگام استفاده از برنامه با خطایی مواجه شده‌اید یا پیشنهادی برای بهبود آن دارید، این فرم را پر کنید. گزارش شما باعث بهبود عملکرد برنامه در شرایط واقعی، به‌ویژه برای افراد توانخواه خواهد شد.
                    </AlertDescription>
                </Alert>

                <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                    {/* Report Type Select */}
                    <SettingsItem title="نوع گزارش">
                        <Select value={reportType} onValueChange={setReportType} required>
                            <SelectTrigger className="w-full" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl" data-lang="arabic">
                                {reportTypes.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsItem>

                    <SettingsItem title="نوع گزارش">
                        <Select value={relatedSection} onValueChange={setRelatedSection} required>
                            <SelectTrigger className="w-full" dir="rtl">
                                <SelectValue placeholder="یک بخش را انتخاب کنید" />
                            </SelectTrigger>
                            <SelectContent dir="rtl" data-lang="arabic">
                                {relatedSections.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsItem>


                    <SettingsItem title={"شرح " + (reportType === "suggestion" ? "پیشنهاد" : "خطا")}>
                        <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)}
                            placeholder={reportType === "suggestion" ? "پیشنهادتان را شرح دهید" : "خطا و شیوه بازتولید آن (در صورت کشف) را شرح دهید"} />
                    </SettingsItem>

                    <Field orientation="horizontal">
                        <Checkbox checked={isDisability} onCheckedChange={setIsDisability} />
                        <Label className="text-base">من توانخواه هستم</Label>
                    </Field>
                </form>
            </div>

            {/* Submit Button */}
            <div className="mt-6 w-full">
                <ActionButton
                    isActive={isFormValid()}
                    isLoading={isLoading}
                    type="info"
                    hasArrow={false}
                    onClick={handleSubmit}
                >
                    ارسال گزارش
                </ActionButton>
            </div>
        </div>
    );
}